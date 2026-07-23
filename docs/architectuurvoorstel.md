# Architectuurvoorstel — Ticket- & eventplatform Lionsclub Voorschoten

Status: **goedgekeurd** (basis voor fase 1). Dit document is het architectuurvoorstel +
datamodel dat gevraagd werd vóórdat de fase-1-implementatie start.

## Uitgangspunten

- Eerste evenement: goededoelenfeest in een café, verwacht 100-150 verkochte kaarten.
- Multi-event, single-tenant: `Organization` (nu 1 rij, Lionsclub Voorschoten) beheert
  meerdere `Event`s. Multi-club/multi-tenant wordt nu niet gebouwd, maar het datamodel
  sluit dit niet expliciet uit.
- Bevestigde scope-keuzes: één ticketprijs voor dit evenement (categorieën kunnen later
  zonder schemawijziging), Resend als mailprovider, restitutie altijd via het bestuur
  (geen self-service-annulering), alleen Nederlandstalige content nu.

## Monorepo & apps

Turborepo + pnpm workspaces, drie Next.js-apps + gedeelde packages:

- `apps/web` — publieke marketing/verkoopsite (SSR/SSG, SEO).
- `apps/admin` — CMS/backend met RBAC (admin, finance, editor, door-staff).
- `apps/scanner` — PWA voor toegangscontrole, offline-tolerant.
- `packages/db` — Prisma-schema + gegenereerde client, gedeeld door alle apps.
- `packages/core` — businesslogica: auth-guards/RBAC, Mollie-afhandeling,
  ticket-QR/PDF-generatie, e-mailrendering.
- `packages/config` — gedeelde tsconfig/eslint-presets.

Elke app is een los Vercel-project binnen dezelfde GitHub-repo/monorepo, zodat ze
onafhankelijk kunnen builden/deployen (`turbo run build --filter=@lions/web`, etc.).

## Database & hosting

**Supabase (managed Postgres)**, niet Neon. Motivatie: Supabase levert in dezelfde
dienst ook Auth en Storage — dat scheelt losse diensten voor staff-login
(admin/finance/editor/door-staff) en voor CMS-media (sponsorlogo's, hero-afbeeldingen).
Bij deze schaal (100-150 tickets) blijft dit ruim binnen de gratis/laagste betaalde laag.
Neon is DB-only en zou een aparte auth-oplossing (NextAuth/Clerk) en aparte storage
(Vercel Blob) vereisen — meer bewegende delen voor een vrijwilligersbestuur dat het zelf
moet beheren. Vercel + Supabase hebben bovendien een native integratie (env-var-sync).

## Auth & RBAC

- **Supabase Auth** voor staff-accounts (admin/finance/editor/door-staff). Kopers krijgen
  bewust géén account — minimale dataopslag (AVG).
- Prisma `User`-model bevat alleen `supabaseAuthId` + `role`; naamgeving/patroon is
  bewust vergelijkbaar met `profiles` uit het HR-portal-project van dezelfde gebruiker.
- **RBAC-grens:** een gedeelde `requireRole()`-guard in `packages/core`, verplicht in élke
  API-route/Server Action. **Bewuste afwijking t.o.v. het HR-portal-project:** daar is
  Postgres RLS de enige echte beveiligingsgrens; hier gebruiken we Prisma (zoals gevraagd),
  en Prisma's connection-pooling model leent zich niet goed voor per-request
  RLS-rolwisseling. RLS blijft wél aangezet met een default-deny policy op alle tabellen
  voor de `anon`/`authenticated` Postgres-rollen, als goedkope extra laag mocht er ooit
  buiten Prisma om (direct via PostgREST/Supabase-client) worden gequeryd.

## Betalingen (Mollie)

- `@mollie/api-client`, met test-/live-keys opgeslagen in de `Setting`-tabel, versleuteld
  met een server-only `SETTINGS_ENCRYPTION_KEY` (AES-256-GCM) — nooit in git of `.env` in
  productie.
- **Idempotente webhook:** de handler vertrouwt nooit de webhook-body zelf, haalt de
  betaalstatus altijd opnieuw op bij Mollie, en verwerkt binnen een DB-transactie die de
  `Order`-rij locked. Herhaalde/vertraagde meldingen wijzigen de order dus maar één keer.

## Voorraadbeheer (concurrency)

Orderaanmaak gebeurt in één DB-transactie:

1. `SELECT ... FOR UPDATE` op de betrokken `TicketType`-rij(en).
2. Controle `totalStock - reservedStock - soldStock >= gevraagd aantal`.
3. `reservedStock` ophogen, `Order` (status `PENDING`, `stockHoldExpiresAt = now() + 15m`)
   + `OrderItem`s wegschrijven.
4. Pas dán de Mollie-checkout-redirect.

Een Vercel Cron-taak zet verlopen `PENDING`-orders naar `EXPIRED` en geeft de
`reservedStock` weer vrij. Bij een geslaagde webhook: `reservedStock -= aantal`,
`soldStock += aantal`, `Order` → `PAID`, `Ticket`s worden aangemaakt, bevestigingsmail
wordt gequeued. Dit voorkomt overboeken bij gelijktijdige aankopen zonder externe
lock-service — ruim voldoende op deze schaal (100-150 kaarten).

## Achtergrondtaken

**Upstash QStash** (serverless HTTP-queue) voor e-mailverzending en
Mollie-webhookverwerking, plus **Vercel Cron** voor periodieke opruiming (verlopen
voorraad-holds, retries voor mislukte e-mails). Past binnen Vercel's serverless model —
geen permanent draaiende worker nodig.

## Tickets: QR, PDF, e-mail

- **QR-token:** `ticketId` + HMAC-SHA256-signature (server-only secret). Een vervalste
  QR-code wordt al bij het decoderen afgewezen, vóór er een DB-lookup gebeurt.
- **PDF:** `qrcode` genereert de QR-PNG, `@react-pdf/renderer`/`pdf-lib` het ticket-PDF,
  `ics` het agenda-bestand.
- **E-mail:** Resend, via hetzelfde raw-fetch-patroon als
  `lib/services/notifications.ts` in het HR-portal-project van dezelfde gebruiker,
  uitgebreid met attachments (PDF + ICS). Templates zijn per `Event` + type + taal
  (`EmailTemplate`), met placeholders zoals `{{voornaam}}`, `{{event_naam}}`,
  `{{aantal_tickets}}`, `{{ticketcode}}`, `{{datum}}`, `{{locatie}}`.

## Scanner: offline-tolerantie

PWA met service worker + IndexedDB-wachtrij. Scans die offline gebeuren worden lokaal
gebufferd (met een optimistische "al gescand deze sessie"-cache tegen verwarrende
dubbele taps) en gesynchroniseerd zodra er weer verbinding is. De server blijft altijd de
uiteindelijke bron van waarheid: een dubbele scan wordt bij sync afgewezen met duidelijke
feedback.

## Datamodel

Zie [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma) voor het
volledige, uitvoerbare schema. Kernrelaties:

```
Organization (1 rij nu)
  └─ Event
       ├─ TicketType ──┐
       ├─ EmailTemplate │
       ├─ PageBlock     │
       └─ Order ────────┘ (via OrderItem)
            └─ Ticket
                 └─ CheckIn

Organization ── User (staff, via Supabase Auth)
Organization ── Setting (key/value, incl. versleutelde Mollie-keys)
Organization ── AuditLog
```

## Fasering (ongewijzigd t.o.v. de opdracht)

1. **MVP:** publieke pagina voor 1 evenement, kassaflow met Mollie test-mode,
   ticket-QR-generatie, orderbevestigingsmail, basis-admin met login + rol `ADMIN`.
2. Volledige RBAC (4 rollen), instellingenscherm incl. Mollie live/test-keys,
   e-mailtemplate-editor met placeholders, content-/pagina-editor voor de publieke site.
3. Dashboard met verkoopstatistieken, scanner-webapp voor check-in, audit-log.
4. Opschaal-voorbereiding: multi-event-ondersteuning, i18n (EN), performance-tuning,
   monitoring.

Elke fase levert werkende, testbare code + migraties + deploy-notities + een
commit-voorstel, en fase 1 start pas na een expliciet akkoord op dit voorstel.

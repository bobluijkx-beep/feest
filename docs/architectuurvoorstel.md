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

**Cron-frequentie:** het Hobby-plan van Vercel staat geen cron-schema's toe die vaker
dan 1x per dag draaien (`vercel.json` staat op `0 3 * * *`, niet elke paar minuten zoals
oorspronkelijk voorgesteld). Gevolg: een niet-afgemaakte betaling houdt de gereserveerde
voorraad tot max. 24 uur vast in plaats van de 15 minuten van de hold zelf, voordat de
cron 'm vrijgeeft. Voor 100-150 kaarten is dat acceptabel; bij een upgrade naar Vercel
Pro kan dit terug naar een paar minuten.

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

---

## Uitbreiding (voorstel — nog niet goedgekeurd): merchandise & generieke webshop

**Status: ontwerp ter beoordeling.** Nog geen schema-wijziging of code — pas na expliciet
akkoord, zelfde werkwijze als bij fase 1.

**Aanleiding:** naast tickets ook merchandise kunnen verkopen (in dezelfde afrekening,
vermeld op het ticket), en dit platform later kunnen hergebruiken voor een heel ander
soort verkoop (oliebollenactie) zonder toegangscontrole.

### Datamodel

Nieuw model `Product`, vrijwel identiek aan `TicketType` (zelfde voorraadpatroon):

```prisma
model Product {
  id            String      @id @default(cuid())
  eventId       String
  event         Event       @relation(fields: [eventId], references: [id])
  name          String
  description   String?
  priceCents    Int
  currency      String      @default("EUR")
  totalStock    Int
  reservedStock Int         @default(0)
  soldStock     Int         @default(0)
  isActive      Boolean     @default(true)
  orderItems    OrderItem[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

`OrderItem` krijgt een tweede, eveneens optionele relatie:

```prisma
model OrderItem {
  ...
  ticketTypeId String?      // was verplicht, wordt optioneel
  ticketType   TicketType?  @relation(fields: [ticketTypeId], references: [id])
  productId    String?
  product      Product?     @relation(fields: [productId], references: [id])
  ...
}
```

Een `OrderItem` verwijst naar **precies één van beide** — afgedwongen met een
`CHECK`-constraint in de migratie-SQL zelf (Prisma's schema-DSL kent geen check-syntax,
maar de migratie is toch handgegenereerde raw SQL, dus dit kan gewoon worden toegevoegd),
niet alleen als applicatie-aanname.

### Kassaflow (generalisatie van `create-order.ts`)

Dezelfde `SELECT ... FOR UPDATE`-transactie als nu, maar in twee vaste stappen (voorkomt
deadlocks tussen gelijktijdige checkouts): eerst alle betrokken `TicketType`-id's gesorteerd
locken, dán alle betrokken `Product`-id's gesorteerd locken. Beide worden op dezelfde
manier gecontroleerd (`totalStock - reservedStock - soldStock >= gevraagd`) en
opgehoogd. `totalCents` wordt over beide heen gesommeerd. De rest van de flow (Mollie-
payment, QStash-opruiming, webhook-idempotentie) verandert niet.

### Fulfillment: tickets vs. merchandise

- `TicketType`-regels genereren zoals nu een `Ticket` (QR, check-in-baar).
- `Product`-regels genereren **geen** `Ticket`-rij (geen toegangscontrole nodig) — wel
  vermeld als regel op het ticket-PDF/de bevestigingsmail ("+ 1x Lions T-shirt (maat L)"),
  zoals gevraagd.
- Een order met **uitsluitend** `Product`-regels (bv. een pure oliebollenverkoop) krijgt
  geen QR-ticket-PDF maar een gewone orderbevestiging/bonnetje — `generateTicketPdf()` en
  `sendOrderConfirmationEmail()` in `packages/core` worden hierop gesplitst/uitgebreid.

### Admin & publieke site

- Nieuwe `/products`-pagina in de admin, exact hetzelfde patroon als de zojuist gebouwde
  `/ticket-types`-pagina (bewerken/aanmaken/deactiveren, voorraad nooit onder
  gereserveerd+verkocht).
- Publieke eventpagina krijgt een "Merchandise"-sectie naast "Tickets" in hetzelfde
  afrekenformulier (aantal-per-product, net als nu per ticketsoort).

### Hergebruik voor een oliebollenverkoop

Dit vereist **geen nieuwe app of architectuur** — het platform is al multi-event
(`Organization` → meerdere `Event`s). Een oliebollenactie wordt gewoon een nieuw `Event`
met nul `TicketType`s en één of meer `Product`s, binnen dezelfde Vercel-projecten/RBAC/
Mollie-koppeling/audit-log. Enige aanpassing: de publieke pagina/copy ("Tickets",
"Afrekenen met iDeal") moet neutraler/conditioneel worden zodat een product-only event er
niet uitziet als een ticketpagina zonder tickets.

### Voorgestelde fasering

Gezien de omvang (schema + kassaflow + PDF/mail + admin + publieke pagina) stel ik voor
dit net als fase 1-3 in behapbare stukken te bouwen, elk met eigen verificatie en
commit-voorstel:

1. **4a — datamodel + kassaflow:** `Product`-model, migratie, gegeneraliseerde
   `createOrder()`/webhook-stockafhandeling. Verificatie: gemengde test-checkout
   (ticket + product) doorlopen, voorraad van beide correct bijgewerkt.
2. **4b — fulfillment:** PDF/mail-aanpassing (merch-regels op het ticket, receipt-only
   voor product-only orders). Verificatie: e-mail/PDF bekijken voor een gemengde en een
   pure product-order.
3. **4c — admin + publieke UI:** `/products`-pagina, merchandise-sectie op de publieke
   pagina. Verificatie: product aanmaken, op de publieke pagina meebestellen, in admin
   terugzien.
4. **4d — oliebollen-praktijktest:** een tweede, product-only `Event` aanmaken en een
   volledige test-aankoop doorlopen als bewijs dat hergebruik werkt zonder codewijziging.

Elke deelstap wacht op een apart akkoord, zoals steeds in dit project.

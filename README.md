# Lionsclub Voorschoten — ticket- & eventplatform

Monorepo voor de publieke ticketsite, het beheer-CMS en de check-in-scanner van
Lionsclub Voorschoten. Zie [docs/architectuurvoorstel.md](docs/architectuurvoorstel.md)
voor het volledige architectuurvoorstel en datamodel, en de bron van waarheid voor *waarom*
bepaalde keuzes zo gemaakt zijn.

## Structuur

- `apps/web` — publieke marketing/verkoopsite (poort 3000).
- `apps/admin` — beheer-CMS met RBAC (poort 3001).
- `apps/scanner` — check-in-PWA, offline-tolerant (poort 3002).
- `packages/db` — Prisma-schema + gegenereerde client, gedeeld door alle apps.
- `packages/core` — businesslogica: RBAC-guards, Mollie, ticket-QR/PDF, e-mail.
- `packages/config` — gedeelde tsconfig/eslint.

## Aan de slag

```bash
pnpm install
cp .env.example .env
```

Vul `.env` met een Supabase-project (URL, anon key, service-role key, Postgres
connection strings) en de overige variabelen — zie de comments in
[.env.example](.env.example) voor uitleg per variabele.

```bash
pnpm db:generate   # Prisma client genereren
pnpm db:migrate     # bestaande migraties toepassen op Supabase (prisma migrate deploy,
                     # geen shadow-database nodig)
pnpm dev             # alle apps starten (turbo)
```

De migraties in `packages/db/prisma/migrations` zijn al aangemaakt (offline gegenereerd
met `prisma migrate diff`, zonder dat daar een draaiende database voor nodig was) en
klaar om te `deploy`en zodra er een Supabase-project is. Nieuwe schemawijzigingen
tijdens fase 1+ vereisen wel een lokale/shadow-database voor `prisma migrate dev`
(bijv. via Docker, als dat beschikbaar is) — of kunnen op dezelfde manier offline via
`prisma migrate diff --from-migrations ... --to-schema-datamodel ... --script` worden
gegenereerd.

```bash
pnpm db:seed   # maakt de Organization/Event/TicketType voor lokaal testen
```

De seed print daarna instructies om een staff-gebruiker in Supabase Auth te koppelen aan
een `ADMIN`-rol in de `users`-tabel.

`pnpm db:migrate` en `pnpm db:seed` laden de root-`.env` zelf (via `dotenv-cli`), want de
Prisma CLI kijkt anders alleen in `packages/db` naar een `.env`. Elke Next.js-app laadt de
root-`.env` op zijn beurt via een paar regels in zijn `next.config.mjs` — dat is dus de éne
plek om lokale env-variabelen te beheren, ook al draaien de apps zelf in hun eigen map.

Losse apps starten: `pnpm --filter @lions/web dev`, `--filter @lions/admin`, etc.

## Rollen & rechten

Staff-accounts loggen in via Supabase Auth; de rol staat in `User.role`
(`packages/db/prisma/schema.prisma`):

| Rol          | Toegang |
|--------------|---------|
| `ADMIN`      | Volledige controle, incl. gebruikersbeheer en instellingen/API-keys. |
| `FINANCE`    | Bestellingen, uitbetalingen, Mollie-instellingen, financiële rapportages. Geen contentbeheer. |
| `EDITOR`     | Contentbeheer van de publieke site + e-mailtemplates. Geen financiële data. |
| `DOOR_STAFF` | Alleen de scanner-app / check-in-overzicht. |

De echte grens ligt in de gedeelde `requireRole()`-guard (`packages/core`), verplicht in
elke API-route/Server Action — nooit alleen een UI-check. Zie
[docs/architectuurvoorstel.md](docs/architectuurvoorstel.md#auth--rbac) voor de motivatie
achter deze aanpak (i.p.v. Postgres RLS als primaire grens).

## Status

Architectuurvoorstel + datamodel zijn goedgekeurd. Fase-1-implementatie staat: publieke
eventpagina + kassaflow (Mollie), idempotente webhook, ticket-QR/PDF + ICS,
orderbevestigingsmail, en admin-login met een `ADMIN`-only bestellingenoverzicht. Nog niet
end-to-end getest — er is nog geen Supabase-project; zie hierboven voor wat daarvoor nodig
is.

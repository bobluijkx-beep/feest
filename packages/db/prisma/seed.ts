import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "lionsclub-voorschoten" },
    update: {},
    create: { name: "Lionsclub Voorschoten", slug: "lionsclub-voorschoten" },
  });

  const event = await prisma.event.upsert({
    where: { slug: "goededoelenfeest-2026" },
    update: {},
    create: {
      organizationId: organization.id,
      slug: "goededoelenfeest-2026",
      name: "Goededoelenfeest Lionsclub Voorschoten",
      description: "Een avond vol muziek en gezelligheid, opbrengst naar het goede doel.",
      venue: "Café (nog te bepalen)",
      startsAt: new Date("2026-11-14T20:00:00+01:00"),
      status: "PUBLISHED",
    },
  });

  const existingTicketType = await prisma.ticketType.findFirst({
    where: { eventId: event.id, name: "Toegangskaart" },
  });
  if (!existingTicketType) {
    await prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: "Toegangskaart",
        priceCents: 1500,
        totalStock: 150,
      },
    });
  }

  console.log(`Seed klaar: organisatie '${organization.slug}', event '${event.slug}'.`);
  console.log("");
  console.log("Nog te doen zodra er een Supabase-project is:");
  console.log("1. Maak een staff-gebruiker aan in Supabase Auth (dashboard > Authentication > Users).");
  console.log("2. Koppel die gebruiker aan een ADMIN-rol, bijv. via `npx prisma studio` of:");
  console.log(
    `   INSERT INTO users (id, "organizationId", "supabaseAuthId", email, role) VALUES ` +
      `('<eigen-id>', '${organization.id}', '<supabase-auth-user-id>', '<email>', 'ADMIN');`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

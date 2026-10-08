import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

// The seed runs under tsx, outside Next.js, so it builds its own client. It
// must not import src/server/*: `server-only` throws outside React Server
// Components.
config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "alice@prisma.io" },
      update: { name: "Alice" },
      create: {
        email: "alice@prisma.io",
        name: "Alice",
      },
    }),
    prisma.user.upsert({
      where: { email: "bob@prisma.io" },
      update: { name: "Bob" },
      create: {
        email: "bob@prisma.io",
        name: "Bob",
      },
    }),
  ]);

  console.log(`Seeded ${users.length} users.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

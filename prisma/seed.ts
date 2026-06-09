import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Hash the password before storing — never store plain text
  const passwordHash = await bcrypt.hash("password123", 10);

  // Create a test admin user
  const user = await prisma.user.create({
    data: {
      name: "Dawn",
      email: "dawn@geico.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seed user created:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

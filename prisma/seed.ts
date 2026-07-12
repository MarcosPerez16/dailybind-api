import { PrismaClient, PolicyType, BiLimit, BundledWith, User } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(time);
}

const CLIENT_NAMES = [
  "James Whitfield",
  "Laura Benson",
  "Michael Torres",
  "Emily Sanders",
  "David Kim",
  "Sophia Ramirez",
  "Daniel Wright",
  "Olivia Foster",
  "Matthew Reyes",
  "Grace Coleman",
  "Ethan Bryant",
  "Isabella Ortiz",
  "Noah Fleming",
  "Ava Mitchell",
  "Lucas Hayes",
  "Mia Chavez",
  "Henry Delgado",
  "Chloe Vasquez",
  "Owen Sullivan",
  "Zoe Marshall",
  "Jack Anderson",
  "Lily Peterson",
  "Ryan Castillo",
  "Ella Simmons",
  "Nathan Brooks",
  "Hannah Ferguson",
  "Caleb Douglas",
  "Victoria Newman",
];

// Weighted policy type pool — AUTO/HOME/RENTERS are the bread-and-butter sales
const POLICY_TYPE_POOL: PolicyType[] = [
  ...Array(10).fill(PolicyType.AUTO),
  ...Array(6).fill(PolicyType.HOME),
  ...Array(5).fill(PolicyType.RENTERS),
  PolicyType.CYCLE,
  PolicyType.CYCLE,
  PolicyType.RV,
  PolicyType.ATV,
  PolicyType.BOAT,
  PolicyType.CLASSIC_CAR,
  PolicyType.MEXICO,
  PolicyType.UMBRELLA,
  PolicyType.JEWELRY,
  PolicyType.IDENTITY_THEFT,
  PolicyType.GOLF_CART,
  PolicyType.RENTAL_HOME,
  PolicyType.RENTAL_CONDO,
  PolicyType.MANUFACTURED_HOME,
  PolicyType.CONDO,
];

const BI_LIMITS: BiLimit[] = [
  BiLimit.LIMIT_25_50,
  BiLimit.LIMIT_50_100,
  BiLimit.LIMIT_100_300,
  BiLimit.LIMIT_250_500,
  BiLimit.LIMIT_300_500,
  BiLimit.LIMIT_500_500,
];

const BUNDLED_WITH_OPTIONS: BundledWith[] = [
  BundledWith.HOME,
  BundledWith.RENTERS,
  BundledWith.CYCLE,
];

function premiumForPolicyType(policyType: PolicyType): number {
  switch (policyType) {
    case PolicyType.AUTO:
      return randomInt(800, 2200);
    case PolicyType.HOME:
    case PolicyType.CONDO:
    case PolicyType.MANUFACTURED_HOME:
    case PolicyType.RENTAL_HOME:
    case PolicyType.RENTAL_CONDO:
      return randomInt(1000, 3000);
    case PolicyType.RENTERS:
      return randomInt(150, 400);
    case PolicyType.CYCLE:
    case PolicyType.ATV:
    case PolicyType.GOLF_CART:
      return randomInt(300, 900);
    case PolicyType.RV:
    case PolicyType.BOAT:
    case PolicyType.CLASSIC_CAR:
      return randomInt(600, 1800);
    case PolicyType.MEXICO:
      return randomInt(200, 600);
    case PolicyType.UMBRELLA:
      return randomInt(250, 700);
    case PolicyType.JEWELRY:
    case PolicyType.IDENTITY_THEFT:
      return randomInt(50, 200);
    default:
      return randomInt(200, 800);
  }
}

function bundledWithFor(policyType: PolicyType): BundledWith {
  const options = BUNDLED_WITH_OPTIONS.filter(
    (option) => option !== (policyType as unknown as BundledWith)
  );
  return randomItem(options.length > 0 ? options : BUNDLED_WITH_OPTIONS);
}

async function main() {
  // Wipe existing data so the seed can be re-run safely during development
  await prisma.sale.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const dawn = await prisma.user.create({
    data: {
      name: "Dawn",
      email: "dawn@geico.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  const agentNames = [
    "Jake Thompson",
    "Maria Gonzalez",
    "Chris Patel",
    "Ashley Nguyen",
    "Brandon Carter",
    "Sam Rodriguez",
  ];

  const agents: User[] = [];
  for (const name of agentNames) {
    const email = `${name.toLowerCase().replace(" ", ".")}@geico.com`;
    const agent = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "AGENT",
      },
    });
    agents.push(agent);
  }

  console.log("Seed users created:", dawn.email, ...agents.map((a) => a.email));

  // Spread sales across the current month plus the prior ~3 months
  const today = new Date();
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);

  const saleCount = randomInt(30, 40);
  const salesData = Array.from({ length: saleCount }).map((_, index) => {
    const policyType = randomItem(POLICY_TYPE_POOL);
    const isBundled = Math.random() < 0.35;
    const isPaidInFull = Math.random() < 0.45;
    const agent = randomItem(agents);
    // Admin occasionally enters a sale on behalf of an agent
    const enteredBy = Math.random() < 0.15 ? dawn : agent;

    return {
      agentId: agent.id,
      date: randomDate(rangeStart, today),
      clientName: randomItem(CLIENT_NAMES),
      policyNumber: `POL-${randomInt(100000, 999999)}`,
      policyType,
      biLimit: policyType === PolicyType.AUTO ? randomItem(BI_LIMITS) : null,
      premiumAmount: premiumForPolicyType(policyType),
      isBundled,
      bundledWith: isBundled ? bundledWithFor(policyType) : null,
      isPaidInFull,
      isVoided: index < 2 ? true : false,
      enteredById: enteredBy.id,
    };
  });

  await prisma.sale.createMany({ data: salesData });

  console.log(`Seed sales created: ${salesData.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

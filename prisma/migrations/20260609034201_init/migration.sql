-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('AUTO', 'HOME', 'RENTERS', 'CYCLE');

-- CreateEnum
CREATE TYPE "BiLimit" AS ENUM ('LIMIT_25_50', 'LIMIT_50_100', 'LIMIT_100_300', 'LIMIT_250_500', 'LIMIT_300_500', 'LIMIT_500_500');

-- CreateEnum
CREATE TYPE "BundledWith" AS ENUM ('HOME', 'RENTERS', 'CYCLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "policyType" "PolicyType" NOT NULL,
    "biLimit" "BiLimit",
    "premiumAmount" DECIMAL(65,30) NOT NULL,
    "isBundled" BOOLEAN NOT NULL DEFAULT false,
    "bundledWith" "BundledWith",
    "isPaidInFull" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "enteredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

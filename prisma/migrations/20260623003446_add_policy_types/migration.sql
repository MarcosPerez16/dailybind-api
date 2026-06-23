-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PolicyType" ADD VALUE 'RV';
ALTER TYPE "PolicyType" ADD VALUE 'ATV';
ALTER TYPE "PolicyType" ADD VALUE 'BOAT';
ALTER TYPE "PolicyType" ADD VALUE 'CLASSIC_CAR';
ALTER TYPE "PolicyType" ADD VALUE 'MEXICO';
ALTER TYPE "PolicyType" ADD VALUE 'UMBRELLA';
ALTER TYPE "PolicyType" ADD VALUE 'JEWELRY';
ALTER TYPE "PolicyType" ADD VALUE 'IDENTITY';

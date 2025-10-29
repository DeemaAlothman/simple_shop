/*
  Warnings:

  - You are about to drop the column `addressSnapshot` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `Address` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_userId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "addressSnapshot";

-- DropTable
DROP TABLE "Address";

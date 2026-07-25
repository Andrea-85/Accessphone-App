/*
  Warnings:

  - Added the required column `organizationId` to the `ArchivoPendiente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArchivoPendiente" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WarehouseStock" ADD COLUMN     "stockMaximo" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "stockMinimo" INTEGER NOT NULL DEFAULT 10;

-- AddForeignKey
ALTER TABLE "ArchivoPendiente" ADD CONSTRAINT "ArchivoPendiente_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

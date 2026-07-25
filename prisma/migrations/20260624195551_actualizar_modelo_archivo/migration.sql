/*
  Warnings:

  - Added the required column `contenido` to the `ArchivoPendiente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `ArchivoPendiente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombreOriginal` to the `ArchivoPendiente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArchivoPendiente" ADD COLUMN     "contenido" BYTEA NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "nombreOriginal" TEXT NOT NULL;

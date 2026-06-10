/*
  Warnings:

  - You are about to drop the column `fecha` on the `MovimientosInventario` table. All the data in the column will be lost.
  - You are about to drop the column `productoId` on the `MovimientosInventario` table. All the data in the column will be lost.
  - You are about to drop the column `productoId` on the `WarehouseStock` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[warehouseId,varianteId]` on the table `WarehouseStock` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `varianteId` to the `Detalles_venta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `justificacion` to the `MovimientosInventario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `varianteId` to the `MovimientosInventario` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `tipoMovimiento` on the `MovimientosInventario` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `varianteId` to the `WarehouseStock` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'VENTA', 'MERMA_RECEPCION', 'DAÑO_OPERATIVO');

-- DropForeignKey
ALTER TABLE "MovimientosInventario" DROP CONSTRAINT "MovimientosInventario_productoId_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStock" DROP CONSTRAINT "WarehouseStock_productoId_fkey";

-- DropIndex
DROP INDEX "Detalles_venta_productoId_idx";

-- DropIndex
DROP INDEX "MovimientosInventario_productoId_idx";

-- DropIndex
DROP INDEX "MovimientosInventario_usuarioId_idx";

-- DropIndex
DROP INDEX "WarehouseStock_productoId_idx";

-- DropIndex
DROP INDEX "WarehouseStock_warehouseId_productoId_key";

-- AlterTable
ALTER TABLE "Detalles_venta" ADD COLUMN     "varianteId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "MovimientosInventario" DROP COLUMN "fecha",
DROP COLUMN "productoId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "evidenciaUrl" TEXT,
ADD COLUMN     "justificacion" VARCHAR(255) NOT NULL,
ADD COLUMN     "productosId" INTEGER,
ADD COLUMN     "varianteId" INTEGER NOT NULL,
DROP COLUMN "tipoMovimiento",
ADD COLUMN     "tipoMovimiento" "TipoMovimiento" NOT NULL;

-- AlterTable
ALTER TABLE "Ventas" ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE "WarehouseStock" DROP COLUMN "productoId",
ADD COLUMN     "varianteId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Variante" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "nombreVariante" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "stockActual" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Variante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Variante_sku_key" ON "Variante"("sku");

-- CreateIndex
CREATE INDEX "Variante_productoId_idx" ON "Variante"("productoId");

-- CreateIndex
CREATE INDEX "Detalles_venta_varianteId_idx" ON "Detalles_venta"("varianteId");

-- CreateIndex
CREATE INDEX "WarehouseStock_varianteId_idx" ON "WarehouseStock"("varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseStock_warehouseId_varianteId_key" ON "WarehouseStock"("warehouseId", "varianteId");

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variante" ADD CONSTRAINT "Variante_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detalles_venta" ADD CONSTRAINT "Detalles_venta_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientosInventario" ADD CONSTRAINT "MovInv_Variante_FK" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientosInventario" ADD CONSTRAINT "MovimientosInventario_productosId_fkey" FOREIGN KEY ("productosId") REFERENCES "Productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

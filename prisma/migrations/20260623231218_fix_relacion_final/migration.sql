-- DropForeignKey
ALTER TABLE "WarehouseStock" DROP CONSTRAINT "WarehouseStock_varianteId_fkey";

-- AlterTable
ALTER TABLE "WarehouseStock" ADD COLUMN     "productosId" INTEGER;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_productosId_fkey" FOREIGN KEY ("productosId") REFERENCES "Productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

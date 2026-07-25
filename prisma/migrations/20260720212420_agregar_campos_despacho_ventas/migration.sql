-- AlterTable
ALTER TABLE "Ventas" ADD COLUMN     "fechaDespacho" TIMESTAMP(3),
ADD COLUMN     "numeroGuia" TEXT,
ADD COLUMN     "transportadora" TEXT DEFAULT 'Interrapidísimo',
ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE_PAGO';

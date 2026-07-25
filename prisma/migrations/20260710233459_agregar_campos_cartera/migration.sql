/*
  Warnings:

  - You are about to drop the column `empleado` on the `Reportes_novedad` table. All the data in the column will be lost.
  - You are about to drop the column `producto` on the `Reportes_novedad` table. All the data in the column will be lost.
  - Added the required column `empleadoId` to the `Reportes_novedad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empleadoText` to the `Reportes_novedad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Reportes_novedad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productoText` to the `Reportes_novedad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `varianteId` to the `Reportes_novedad` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Clientes" ADD COLUMN     "limiteCredito" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "permiteCredito" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Reportes_novedad" DROP COLUMN "empleado",
DROP COLUMN "producto",
ADD COLUMN     "cantidad" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "empleadoId" INTEGER NOT NULL,
ADD COLUMN     "empleadoText" VARCHAR(100) NOT NULL,
ADD COLUMN     "organizationId" INTEGER NOT NULL,
ADD COLUMN     "productoText" VARCHAR(100) NOT NULL,
ADD COLUMN     "varianteId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "AlertasInventario" (
    "id" SERIAL NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertasInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteCompra" (
    "id" SERIAL NOT NULL,
    "numeroLote" TEXT NOT NULL,
    "costoCompra" DECIMAL(65,30) NOT NULL,
    "cantidadInicial" INTEGER NOT NULL,
    "cantidadActual" INTEGER NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoteCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SugerenciasAgente" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "productoId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SugerenciasAgente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartera" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "montoInicial" DECIMAL(12,2) NOT NULL,
    "saldoActual" DECIMAL(12,2) NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'VIGENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cartera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonos" (
    "id" SERIAL NOT NULL,
    "carteraId" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "referencia" VARCHAR(255),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "abonos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreMes" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "totalVentas" DECIMAL(12,2) NOT NULL,
    "totalInversion" DECIMAL(12,2) NOT NULL,
    "totalMermas" DECIMAL(12,2) NOT NULL,
    "gananciaNeta" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreMes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cartera_ventaId_key" ON "cartera"("ventaId");

-- CreateIndex
CREATE INDEX "cartera_organizationId_idx" ON "cartera"("organizationId");

-- CreateIndex
CREATE INDEX "cartera_clienteId_estado_idx" ON "cartera"("clienteId", "estado");

-- CreateIndex
CREATE INDEX "abonos_carteraId_idx" ON "abonos"("carteraId");

-- CreateIndex
CREATE UNIQUE INDEX "CierreMes_organizationId_mes_anio_key" ON "CierreMes"("organizationId", "mes", "anio");

-- AddForeignKey
ALTER TABLE "LoteCompra" ADD CONSTRAINT "LoteCompra_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugerenciasAgente" ADD CONSTRAINT "SugerenciasAgente_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugerenciasAgente" ADD CONSTRAINT "SugerenciasAgente_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartera" ADD CONSTRAINT "cartera_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartera" ADD CONSTRAINT "cartera_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartera" ADD CONSTRAINT "cartera_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_carteraId_fkey" FOREIGN KEY ("carteraId") REFERENCES "cartera"("id") ON DELETE CASCADE ON UPDATE CASCADE;

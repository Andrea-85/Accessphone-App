/*
  Warnings:

  - You are about to alter the column `nombre` on the `Subcategoria` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(80)`.
  - You are about to drop the `categorias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clientes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `detalles_venta` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reportes_novedad` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ventas` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[categoriaId,nombre]` on the table `Subcategoria` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'GRACE_PERIOD');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "BalanceMutationType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'VENDEDOR', 'BODEGUERO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CREDITO', 'OTRO');

-- DropForeignKey
ALTER TABLE "Subcategoria" DROP CONSTRAINT "Subcategoria_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "detalles_venta" DROP CONSTRAINT "detalles_venta_productoId_fkey";

-- DropForeignKey
ALTER TABLE "detalles_venta" DROP CONSTRAINT "detalles_venta_ventaId_fkey";

-- DropForeignKey
ALTER TABLE "productos" DROP CONSTRAINT "productos_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "productos" DROP CONSTRAINT "productos_subcategoriaId_fkey";

-- DropForeignKey
ALTER TABLE "ventas" DROP CONSTRAINT "ventas_clienteId_fkey";

-- AlterTable
ALTER TABLE "Subcategoria" ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(80);

-- DropTable
DROP TABLE "categorias";

-- DropTable
DROP TABLE "clientes";

-- DropTable
DROP TABLE "detalles_venta";

-- DropTable
DROP TABLE "productos";

-- DropTable
DROP TABLE "reportes_novedad";

-- DropTable
DROP TABLE "usuarios";

-- DropTable
DROP TABLE "ventas";

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionExpires" TIMESTAMP(3),
    "automaticLock" BOOLEAN NOT NULL DEFAULT true,
    "graceDays" INTEGER NOT NULL DEFAULT 3,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "paymentMethodId" VARCHAR(191),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "type" "BalanceMutationType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" VARCHAR(500),
    "externalRef" VARCHAR(191),
    "balanceAfter" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "direccion" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseStock" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WarehouseStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "referencia" VARCHAR(255),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Productos" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "costo" DECIMAL(65,30) NOT NULL,
    "estado" VARCHAR(20),
    "descripcion_estado" TEXT,
    "categoriaId" INTEGER,
    "imagen" TEXT,
    "subcategoriaId" INTEGER,
    "imei" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categorias" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,

    CONSTRAINT "Categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clientes" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "direccion" TEXT,
    "cedula" VARCHAR(20) NOT NULL,

    CONSTRAINT "Clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ventas" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" INTEGER NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Detalles_venta" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Detalles_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuarios" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'VENDEDOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reportes_novedad" (
    "id" SERIAL NOT NULL,
    "empleado" VARCHAR(100) NOT NULL,
    "producto" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "foto_url" VARCHAR(500),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "Reportes_novedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientosInventario" (
    "id" SERIAL NOT NULL,
    "tipoMovimiento" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "MovimientosInventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "transactions_organizationId_idx" ON "transactions"("organizationId");

-- CreateIndex
CREATE INDEX "transactions_organizationId_createdAt_idx" ON "transactions"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Warehouse_organizationId_idx" ON "Warehouse"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_organizationId_nombre_key" ON "Warehouse"("organizationId", "nombre");

-- CreateIndex
CREATE INDEX "WarehouseStock_productoId_idx" ON "WarehouseStock"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseStock_warehouseId_productoId_key" ON "WarehouseStock"("warehouseId", "productoId");

-- CreateIndex
CREATE INDEX "Payment_ventaId_idx" ON "Payment"("ventaId");

-- CreateIndex
CREATE INDEX "Productos_organizationId_idx" ON "Productos"("organizationId");

-- CreateIndex
CREATE INDEX "Productos_organizationId_categoriaId_idx" ON "Productos"("organizationId", "categoriaId");

-- CreateIndex
CREATE INDEX "Categorias_organizationId_idx" ON "Categorias"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Categorias_organizationId_nombre_key" ON "Categorias"("organizationId", "nombre");

-- CreateIndex
CREATE INDEX "Clientes_organizationId_idx" ON "Clientes"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Clientes_organizationId_cedula_key" ON "Clientes"("organizationId", "cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Clientes_organizationId_email_key" ON "Clientes"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Ventas_organizationId_idx" ON "Ventas"("organizationId");

-- CreateIndex
CREATE INDEX "Ventas_organizationId_fecha_idx" ON "Ventas"("organizationId", "fecha");

-- CreateIndex
CREATE INDEX "Detalles_venta_ventaId_idx" ON "Detalles_venta"("ventaId");

-- CreateIndex
CREATE INDEX "Detalles_venta_productoId_idx" ON "Detalles_venta"("productoId");

-- CreateIndex
CREATE INDEX "Usuarios_organizationId_idx" ON "Usuarios"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_organizationId_email_key" ON "Usuarios"("organizationId", "email");

-- CreateIndex
CREATE INDEX "MovimientosInventario_productoId_idx" ON "MovimientosInventario"("productoId");

-- CreateIndex
CREATE INDEX "MovimientosInventario_usuarioId_idx" ON "MovimientosInventario"("usuarioId");

-- CreateIndex
CREATE INDEX "Subcategoria_categoriaId_idx" ON "Subcategoria"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategoria_categoriaId_nombre_key" ON "Subcategoria"("categoriaId", "nombre");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Productos" ADD CONSTRAINT "Productos_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Productos" ADD CONSTRAINT "Productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Productos" ADD CONSTRAINT "Productos_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Subcategoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categorias" ADD CONSTRAINT "Categorias_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategoria" ADD CONSTRAINT "Subcategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clientes" ADD CONSTRAINT "Clientes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ventas" ADD CONSTRAINT "Ventas_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ventas" ADD CONSTRAINT "Ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detalles_venta" ADD CONSTRAINT "Detalles_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detalles_venta" ADD CONSTRAINT "Detalles_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientosInventario" ADD CONSTRAINT "MovimientosInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientosInventario" ADD CONSTRAINT "MovimientosInventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

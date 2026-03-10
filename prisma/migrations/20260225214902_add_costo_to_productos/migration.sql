-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "categoria" VARCHAR(50),
    "precio" DECIMAL(12,2) NOT NULL,
    "costo" DECIMAL(65,30) NOT NULL,
    "stock" INTEGER NOT NULL,
    "estado" VARCHAR(20),
    "imei" VARCHAR(20),
    "descripcion_estado" TEXT,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "direccion" TEXT,
    "cedula" VARCHAR(20) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" INTEGER NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_venta" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalles_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'vendedor',

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_imei_key" ON "productos"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cedula_key" ON "clientes"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

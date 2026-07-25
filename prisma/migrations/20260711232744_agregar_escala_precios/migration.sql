-- CreateTable
CREATE TABLE "EscalaPrecio" (
    "id" SERIAL NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "cantidadMin" INTEGER NOT NULL,
    "precioVenta" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "EscalaPrecio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EscalaPrecio" ADD CONSTRAINT "EscalaPrecio_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

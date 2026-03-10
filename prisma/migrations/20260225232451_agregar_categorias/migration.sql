/*
  Warnings:

  - You are about to drop the column `categoria` on the `productos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "productos" DROP COLUMN "categoria",
ADD COLUMN     "categoriaId" INTEGER;

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

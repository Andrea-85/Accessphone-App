-- CreateTable
CREATE TABLE "reportes_novedad" (
    "id" SERIAL NOT NULL,
    "empleado" VARCHAR(100) NOT NULL,
    "producto" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "foto_url" VARCHAR(500),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "reportes_novedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialChat" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "remitente" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorialChat_clienteId_idx" ON "HistorialChat"("clienteId");

-- CreateIndex
CREATE INDEX "HistorialChat_clienteId_createdAt_idx" ON "HistorialChat"("clienteId", "createdAt");

-- AddForeignKey
ALTER TABLE "HistorialChat" ADD CONSTRAINT "HistorialChat_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ModoAtencion" AS ENUM ('IA', 'HUMANO');

-- AlterTable
ALTER TABLE "Clientes" ADD COLUMN     "modoAtencion" "ModoAtencion" NOT NULL DEFAULT 'IA';

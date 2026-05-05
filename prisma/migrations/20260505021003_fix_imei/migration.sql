-- DropIndex
DROP INDEX "productos_imei_key";

-- AlterTable
ALTER TABLE "productos" ALTER COLUMN "imei" SET DATA TYPE TEXT;

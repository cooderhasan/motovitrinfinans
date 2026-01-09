-- AlterTable
ALTER TABLE "sales_slips" 
ADD COLUMN "uuid" TEXT,
ADD COLUMN "invoice_number" TEXT,
ADD COLUMN "sent_to_nes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sent_at" TIMESTAMP(3),
ADD COLUMN "invoice_type" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_slips_uuid_key" ON "sales_slips"("uuid");

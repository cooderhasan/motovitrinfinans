-- CreateTable (if not exists) - Initial migration
-- This migration adds contact fields to the caries table

-- Add new columns to caries table
ALTER TABLE "caries" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "caries" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "caries" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "caries" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "caries" ADD COLUMN IF NOT EXISTS "tax_number" TEXT;
ALTER TABLE "caries" ADD COLUMN IF NOT EXISTS "tax_office" TEXT;
ALTER TABLE "caries" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Create settings table if not exists
CREATE TABLE IF NOT EXISTS "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- Create unique index on settings key if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_key" ON "settings"("key");

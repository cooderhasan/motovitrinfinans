-- Add description column to payments table
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "description" TEXT;

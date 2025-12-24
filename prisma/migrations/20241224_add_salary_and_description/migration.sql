-- Add salary field to caries table for employee salaries
ALTER TABLE "caries" ADD COLUMN IF NOT EXISTS "salary" DECIMAL(18, 2);

-- Add description field to cash_transactions for tracking advance/salary/other types
ALTER TABLE "cash_transactions" ADD COLUMN IF NOT EXISTS "description" VARCHAR(255);

-- Investor's own description of goals, preferences, and strategy.
-- IF NOT EXISTS keeps this safe on databases already synced with `prisma db push`.
ALTER TABLE "UserInvestmentProfile" ADD COLUMN IF NOT EXISTS "strategyMessage" TEXT;

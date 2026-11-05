-- Live notes and decisions for the agent page.
ALTER TABLE "AgentRun" ADD COLUMN IF NOT EXISTS "trace" JSONB;

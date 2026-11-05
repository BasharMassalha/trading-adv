-- CreateEnum
CREATE TYPE "TradingAgentStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'NO_TRADE', 'FAILED');

-- CreateTable
CREATE TABLE "TradingAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourcePortfolioId" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "status" "TradingAgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "mandate" TEXT NOT NULL DEFAULT 'MAXIMIZE_RETURN',
    "maxPositionWeight" DECIMAL(6,4) NOT NULL DEFAULT 0.12,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'RUNNING',
    "summary" TEXT,
    "error" TEXT,
    "reportId" TEXT,
    "portfolioValueBefore" DECIMAL(18,4),
    "portfolioValueAfter" DECIMAL(18,4),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentOrder" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "shares" DECIMAL(24,8) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "notional" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingAgent_portfolioId_key" ON "TradingAgent"("portfolioId");

-- CreateIndex
CREATE INDEX "TradingAgent_userId_idx" ON "TradingAgent"("userId");

-- CreateIndex
CREATE INDEX "TradingAgent_status_idx" ON "TradingAgent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TradingAgent_userId_sourcePortfolioId_key" ON "TradingAgent"("userId", "sourcePortfolioId");

-- CreateIndex
CREATE INDEX "AgentRun_agentId_startedAt_idx" ON "AgentRun"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "AgentOrder_runId_idx" ON "AgentOrder"("runId");

-- AddForeignKey
ALTER TABLE "TradingAgent" ADD CONSTRAINT "TradingAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingAgent" ADD CONSTRAINT "TradingAgent_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingAgent" ADD CONSTRAINT "TradingAgent_sourcePortfolioId_fkey" FOREIGN KEY ("sourcePortfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "TradingAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentOrder" ADD CONSTRAINT "AgentOrder_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

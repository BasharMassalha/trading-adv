-- CreateEnum
CREATE TYPE "RiskTolerance" AS ENUM ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "InvestmentHorizon" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- CreateEnum
CREATE TYPE "InvestmentGoal" AS ENUM ('GROWTH', 'INCOME', 'BALANCED', 'CAPITAL_PRESERVATION');

-- CreateEnum
CREATE TYPE "AssetPreference" AS ENUM ('ETF_ONLY', 'MOSTLY_ETFS', 'MIXED', 'MOSTLY_STOCKS');

-- CreateEnum
CREATE TYPE "PortfolioSource" AS ENUM ('MANUAL', 'CSV', 'IMAGE', 'BROKER_SYNC');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'ETF', 'CRYPTO', 'BOND', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "AIReportStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvestmentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "riskTolerance" "RiskTolerance" NOT NULL DEFAULT 'MODERATE',
    "investmentHorizon" "InvestmentHorizon" NOT NULL DEFAULT 'MEDIUM',
    "investmentGoal" "InvestmentGoal" NOT NULL DEFAULT 'BALANCED',
    "assetPreference" "AssetPreference" NOT NULL DEFAULT 'MIXED',
    "preferredRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoidedSectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,

    CONSTRAINT "UserInvestmentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "source" "PortfolioSource" NOT NULL DEFAULT 'MANUAL',
    "totalValue" DECIMAL(18,4),
    "totalCost" DECIMAL(18,4),
    "totalGain" DECIMAL(18,4),
    "lastEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioHolding" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "averageCost" DECIMAL(18,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "marketValue" DECIMAL(18,4),
    "unrealizedGainLoss" DECIMAL(18,4),
    "weight" DECIMAL(10,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL DEFAULT 'STOCK',
    "exchange" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sector" TEXT,
    "industry" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "latestPrice" DECIMAL(18,4),
    "priceChange" DECIMAL(18,4),
    "priceChangePercent" DECIMAL(8,4),
    "marketCap" DECIMAL(24,4),
    "lastEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetPriceHistory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "close" DECIMAL(18,4) NOT NULL,
    "open" DECIMAL(18,4),
    "high" DECIMAL(18,4),
    "low" DECIMAL(18,4),
    "volume" BIGINT,

    CONSTRAINT "AssetPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "status" "AIReportStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "strengths" JSONB,
    "risks" JSONB,
    "opportunities" JSONB,
    "suggestedActions" JSONB,
    "followUpQuestions" JSONB,
    "modelUsed" TEXT,
    "rawJson" JSONB,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvestmentProfile_userId_key" ON "UserInvestmentProfile"("userId");

-- CreateIndex
CREATE INDEX "Portfolio_userId_idx" ON "Portfolio"("userId");

-- CreateIndex
CREATE INDEX "PortfolioHolding_portfolioId_idx" ON "PortfolioHolding"("portfolioId");

-- CreateIndex
CREATE INDEX "PortfolioHolding_assetId_idx" ON "PortfolioHolding"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioHolding_portfolioId_assetId_key" ON "PortfolioHolding"("portfolioId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "Asset"("symbol");

-- CreateIndex
CREATE INDEX "Asset_symbol_idx" ON "Asset"("symbol");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "AssetPriceHistory_assetId_idx" ON "AssetPriceHistory"("assetId");

-- CreateIndex
CREATE INDEX "AssetPriceHistory_date_idx" ON "AssetPriceHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AssetPriceHistory_assetId_date_key" ON "AssetPriceHistory"("assetId", "date");

-- CreateIndex
CREATE INDEX "AIReport_userId_idx" ON "AIReport"("userId");

-- CreateIndex
CREATE INDEX "AIReport_portfolioId_idx" ON "AIReport"("portfolioId");

-- CreateIndex
CREATE INDEX "AIReport_status_idx" ON "AIReport"("status");

-- AddForeignKey
ALTER TABLE "UserInvestmentProfile" ADD CONSTRAINT "UserInvestmentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioHolding" ADD CONSTRAINT "PortfolioHolding_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioHolding" ADD CONSTRAINT "PortfolioHolding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPriceHistory" ADD CONSTRAINT "AssetPriceHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReport" ADD CONSTRAINT "AIReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReport" ADD CONSTRAINT "AIReport_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

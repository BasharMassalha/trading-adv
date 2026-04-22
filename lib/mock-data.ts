/**
 * Mock data used throughout the scaffold. Replace with real queries when
 * backend logic is wired up.
 */

export type Holding = {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  price: number;
  sector: string;
};

export const MOCK_HOLDINGS: Holding[] = [
  { symbol: "AAPL", name: "Apple Inc.", quantity: 42, avgCost: 145.2, price: 189.45, sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corp.", quantity: 18, avgCost: 298.1, price: 415.7, sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA Corp.", quantity: 12, avgCost: 210.4, price: 875.3, sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A", quantity: 22, avgCost: 118.9, price: 165.1, sector: "Communication Svcs" },
  { symbol: "AMZN", name: "Amazon.com Inc.", quantity: 15, avgCost: 128.5, price: 185.9, sector: "Consumer Disc." },
  { symbol: "TSLA", name: "Tesla Inc.", quantity: 25, avgCost: 220.0, price: 178.2, sector: "Consumer Disc." },
  { symbol: "JPM",  name: "JPMorgan Chase & Co.", quantity: 30, avgCost: 142.3, price: 198.8, sector: "Financials" },
  { symbol: "V",    name: "Visa Inc.", quantity: 20, avgCost: 220.1, price: 275.4, sector: "Financials" },
];

export function computeHoldingStats(h: Holding) {
  const marketValue = h.quantity * h.price;
  const costBasis = h.quantity * h.avgCost;
  const gain = marketValue - costBasis;
  const gainPct = costBasis === 0 ? 0 : (gain / costBasis) * 100;
  return { marketValue, costBasis, gain, gainPct };
}

export function computePortfolioStats(holdings: Holding[] = MOCK_HOLDINGS) {
  const rows = holdings.map((h) => ({ ...h, ...computeHoldingStats(h) }));
  const totalValue = rows.reduce((s, r) => s + r.marketValue, 0);
  const totalCost = rows.reduce((s, r) => s + r.costBasis, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost === 0 ? 0 : (totalGain / totalCost) * 100;
  return { rows, totalValue, totalCost, totalGain, totalGainPct };
}

export const MOCK_PERFORMANCE_SERIES: { date: string; value: number }[] = [
  { date: "Jan", value: 100_000 },
  { date: "Feb", value: 103_200 },
  { date: "Mar", value: 101_800 },
  { date: "Apr", value: 108_500 },
  { date: "May", value: 112_100 },
  { date: "Jun", value: 110_400 },
  { date: "Jul", value: 117_900 },
  { date: "Aug", value: 121_300 },
  { date: "Sep", value: 119_600 },
  { date: "Oct", value: 125_800 },
  { date: "Nov", value: 130_400 },
  { date: "Dec", value: 134_750 },
];

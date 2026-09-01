"use client";

import {
  PortfolioPicker,
  type PortfolioOption,
} from "@/components/portfolio/portfolio-picker";

type Props = {
  portfolios: PortfolioOption[];
  selectedId: string;
};

export function DashboardPortfolioPicker({ portfolios, selectedId }: Props) {
  return (
    <PortfolioPicker
      basePath="/dashboard"
      portfolios={portfolios}
      selectedId={selectedId}
    />
  );
}

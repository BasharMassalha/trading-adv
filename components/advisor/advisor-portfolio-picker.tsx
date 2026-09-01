"use client";

import {
  PortfolioPicker,
  type PortfolioOption,
} from "@/components/portfolio/portfolio-picker";

export type AdvisorPortfolioOption = PortfolioOption;

type Props = {
  portfolios: AdvisorPortfolioOption[];
  selectedId: string;
};

export function AdvisorPortfolioPicker({ portfolios, selectedId }: Props) {
  return (
    <PortfolioPicker
      basePath="/advisor"
      portfolios={portfolios}
      selectedId={selectedId}
    />
  );
}

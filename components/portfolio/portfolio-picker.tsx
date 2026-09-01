"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBeginNavigation } from "@/components/loading/navigation-loading-context";

export type PortfolioOption = {
  id: string;
  name: string;
  holdingCount?: number;
};

type Props = {
  basePath: "/dashboard" | "/advisor";
  portfolios: PortfolioOption[];
  selectedId: string;
};

export function PortfolioPicker({ basePath, portfolios, selectedId }: Props) {
  const router = useRouter();
  const beginNavigation = useBeginNavigation();

  if (portfolios.length === 0) return null;

  function onChange(nextId: string) {
    if (nextId === selectedId) return;
    beginNavigation();
    router.push(`${basePath}?portfolio=${encodeURIComponent(nextId)}`);
    router.refresh();
  }

  return (
    <Select value={selectedId} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full min-w-[180px] max-w-[240px] bg-background text-[13px]">
        <SelectValue placeholder="Select portfolio" />
      </SelectTrigger>
      <SelectContent align="end">
        {portfolios.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-[13px]">
            {p.name}
            {p.holdingCount != null ? ` (${p.holdingCount})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

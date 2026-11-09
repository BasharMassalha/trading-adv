type Conviction = "HIGH" | "MEDIUM" | "LOW";

type WhySignal = {
  conviction?: Conviction;
  reason?: string;
};

function convictionWord(level?: Conviction): string {
  if (level === "HIGH") return "high";
  if (level === "LOW") return "low";
  return "medium";
}

/** Cap stored or historical text so a why line stays scannable. */
export function truncateWhy(text: string, max = 220): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const stem = (space >= 60 ? cut.slice(0, space) : cut)
    .trim()
    .replace(/[,;:.-]+$/, "");
  return `${stem}.`;
}

/** First sentence of the analysis, short enough to read next to a fill. */
export function clipWhy(text: string, max = 140): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const match = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  let first = (match?.[1] ?? cleaned).trim();
  if (!/[.!?]$/.test(first)) first = `${first}.`;
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const stem = (space >= 40 ? cut.slice(0, space) : cut)
    .trim()
    .replace(/[,;:.-]+$/, "");
  return `${stem}.`;
}

function withWhy(lead: string, analysis?: string): string {
  const why = clipWhy(analysis ?? "");
  return why ? `${lead} ${why}` : lead;
}

export function explainSellTrade(signal: WhySignal, fraction: number): string {
  const conv = convictionWord(signal.conviction);
  const lead =
    fraction >= 0.999
      ? `Exited on a ${conv}-conviction sell.`
      : fraction >= 0.5
        ? `Sold half on a ${conv}-conviction sell.`
        : `Trimmed on a ${conv}-conviction call.`;
  return withWhy(lead, signal.reason);
}

export function explainBuyTrade(input: {
  kind: "add" | "open";
  analysis?: string;
  conviction?: Conviction;
}): string {
  const lead =
    input.kind === "open"
      ? "Opened a new position."
      : `Added on a ${convictionWord(input.conviction)}-conviction buy.`;
  return withWhy(lead, input.analysis);
}

export function explainHoldDecision(analysis?: string): string {
  const why = clipWhy(analysis ?? "");
  return why ? `Held. ${why}` : "Held. No buy or sell cleared the bar.";
}

export function explainSkipDecision(
  kind: "low-conviction" | "no-room" | "no-price" | "too-small" | "wanted-sell",
  analysis?: string,
): string {
  if (kind === "low-conviction") {
    return withWhy("Skipped. Conviction was too low to trade.", analysis);
  }
  if (kind === "no-room") {
    return "Skipped the add. Not enough cash or room under the position cap.";
  }
  if (kind === "no-price") {
    return "Skipped. No reliable price, so it was not bought.";
  }
  if (kind === "wanted-sell") {
    return "Skipped the sell. The size was too small to bother.";
  }
  return "Skipped. The size was too small to bother.";
}

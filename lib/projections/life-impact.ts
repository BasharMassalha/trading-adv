/**
 * Plain-language "what this could mean" copy. Hypothetical only.
 */

export type LifeImpactBlock = {
  headline: string;
  intro: string;
  /** Short bullets — lifestyle framing, not promises */
  bullets: string[];
};

function goalPhrase(goal: string | null | undefined): string | null {
  if (!goal) return null;
  switch (goal) {
    case "GROWTH":
      return "Because you’re oriented toward growth, compounding matters most if you stay disciplined through volatility.";
    case "INCOME":
      return "If your focus is income, remember these numbers assume reinvestment — future withdrawals would change the path.";
    case "CAPITAL_PRESERVATION":
      return "If capital preservation is the priority, the higher scenarios below may be less realistic than the conservative band.";
    case "BALANCED":
    default:
      return "With a balanced stance, the middle scenario is often the most plausible long-term anchor.";
  }
}

/**
 * Build a small qualitative block from projected 10-year outcomes.
 */
export function buildLifeImpactBlock(input: {
  startValue: number;
  year10Profit: number;
  year10Value: number;
  annualReturnPct: number;
  investmentGoal?: string | null;
}): LifeImpactBlock {
  const { startValue, year10Profit, year10Value, annualReturnPct, investmentGoal } =
    input;

  const introParts = [
    `Imagine your portfolio compounded at about ${annualReturnPct}% per year with no deposits or withdrawals — unlikely in the real world, but useful as a thought experiment.`,
  ];
  const g = goalPhrase(investmentGoal);
  if (g) introParts.push(g);
  const intro = introParts.join(" ");

  const bullets: string[] = [];
  const p = year10Profit;

  if (p <= 0) {
    bullets.push(
      "At or below break-even over a decade, the lesson is usually risk control and savings rate — not timing the market.",
    );
  } else if (p < 25_000) {
    bullets.push(
      "A gain of this size could cover a solid emergency fund top-up, a used car, or several years of small lifestyle upgrades — not life-changing, but meaningful.",
    );
    bullets.push(
      "You might feel slightly lighter about one-off expenses: repairs, travel, or courses without leaning on credit.",
    );
  } else if (p < 100_000) {
    bullets.push(
      "A mid five-figure to six-figure uplift can meaningfully accelerate a down payment, tuition buffer, or sabbatical fund.",
      "Psychologically, it’s the range where “optional” choices — job changes, time off, saying no to a bad offer — start to feel more realistic.",
    );
  } else if (p < 400_000) {
    bullets.push(
      "Six figures of hypothetical growth often lines up with major life levers: housing, education, or shifting from paycheck-to-paycheck to real optionality.",
      "Many people describe this band as the moment investing stops feeling abstract and starts feeling like a second engine beside their salary.",
    );
  } else {
    bullets.push(
      "Large projected gains (if they ever materialised) can move the needle on retirement timing, supporting family, or philanthropy — but concentration and taxes matter as much as the headline number.",
      "The emotional shift people report isn’t always “luxury” — it’s often sleep, flexibility, and being able to ride out a bad year without panic.",
    );
  }

  bullets.push(
    "None of this is guaranteed. Markets gap up and down; your contributions, fees, taxes, and behaviour usually dominate real outcomes.",
  );

  const headline =
    p > startValue * 0.5
      ? "If things went surprisingly well"
      : p > 25_000
        ? "If steady compounding played out"
        : "What this scale of change can feel like";

  return {
    headline,
    intro,
    bullets,
  };
}

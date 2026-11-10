/**
 * SEC Form 13F freshness relative to the public filing calendar.
 *
 * Managers report holdings as of quarter-end (Mar 31 / Jun 30 / Sep 30 / Dec 31)
 * and generally have 45 days after that date to file. Until the deadline passes,
 * the prior quarter is still the expected “current” book for most filers.
 */

export type FilingFreshnessStatus = "current" | "behind" | "early";

export type FilingFreshness = {
  status: FilingFreshnessStatus;
  /** Expected latest period-end date (YYYY-MM-DD). */
  expectedReportDate: string;
  expectedQuarterLabel: string;
  /** How many quarter-ends the filing trails the expected period (0 = current). */
  quartersBehind: number;
  /** Calendar deadline for the expected period (YYYY-MM-DD). */
  expectedDeadline: string;
  /** Rough next deadline after this filing’s period (YYYY-MM-DD), if known. */
  nextDeadline: string | null;
  label: string;
};

function utcDate(y: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(y, monthIndex, day));
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseIsoDate(iso: string): Date | null {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Quarter-end dates from newest to oldest, covering a few years around `now`. */
export function recentQuarterEnds(now = new Date()): Date[] {
  const y = now.getUTCFullYear();
  const ends: Date[] = [];
  for (let year = y + 1; year >= y - 3; year--) {
    ends.push(utcDate(year, 11, 31)); // Dec 31
    ends.push(utcDate(year, 8, 30)); // Sep 30
    ends.push(utcDate(year, 5, 30)); // Jun 30
    ends.push(utcDate(year, 2, 31)); // Mar 31
  }
  return ends
    .filter((d) => d.getTime() <= now.getTime())
    .sort((a, b) => b.getTime() - a.getTime());
}

export function quarterLabelFromReportDate(reportDate: string): string {
  const d = parseIsoDate(reportDate);
  if (!d) return reportDate;
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()} Q${q}`;
}

/**
 * Latest quarter-end whose 45-day filing window has closed (or is today).
 * Before that deadline, the previous quarter remains the expected published book.
 */
export function expectedLatestReportDate(now = new Date()): {
  reportDate: string;
  deadline: string;
  quarterLabel: string;
} {
  const ends = recentQuarterEnds(now);
  for (const end of ends) {
    const deadline = addDays(end, 45);
    if (deadline.getTime() <= now.getTime()) {
      return {
        reportDate: toIsoDate(end),
        deadline: toIsoDate(deadline),
        quarterLabel: quarterLabelFromReportDate(toIsoDate(end)),
      };
    }
  }
  const fallback =
    ends[ends.length - 1] ?? utcDate(now.getUTCFullYear() - 1, 11, 31);
  return {
    reportDate: toIsoDate(fallback),
    deadline: toIsoDate(addDays(fallback, 45)),
    quarterLabel: quarterLabelFromReportDate(toIsoDate(fallback)),
  };
}

function quartersBetween(older: Date, newer: Date): number {
  const olderIdx =
    older.getUTCFullYear() * 4 + Math.floor(older.getUTCMonth() / 3);
  const newerIdx =
    newer.getUTCFullYear() * 4 + Math.floor(newer.getUTCMonth() / 3);
  return Math.max(0, newerIdx - olderIdx);
}

function followingQuarterEnd(reportDate: Date): Date | null {
  const ends = [
    utcDate(reportDate.getUTCFullYear(), 2, 31),
    utcDate(reportDate.getUTCFullYear(), 5, 30),
    utcDate(reportDate.getUTCFullYear(), 8, 30),
    utcDate(reportDate.getUTCFullYear(), 11, 31),
    utcDate(reportDate.getUTCFullYear() + 1, 2, 31),
  ];
  return ends.find((d) => d.getTime() > reportDate.getTime()) ?? null;
}

export function assessFilingFreshness(
  reportDate: string,
  now = new Date(),
): FilingFreshness {
  const expected = expectedLatestReportDate(now);
  const reported = parseIsoDate(reportDate);
  const expectedDate = parseIsoDate(expected.reportDate);

  if (!reported || !expectedDate) {
    return {
      status: "behind",
      expectedReportDate: expected.reportDate,
      expectedQuarterLabel: expected.quarterLabel,
      quartersBehind: 1,
      expectedDeadline: expected.deadline,
      nextDeadline: null,
      label: "Filing date unclear",
    };
  }

  const nextQuarter = followingQuarterEnd(reported);
  const nextDeadline = nextQuarter ? toIsoDate(addDays(nextQuarter, 45)) : null;

  if (reported.getTime() > expectedDate.getTime()) {
    return {
      status: "early",
      expectedReportDate: expected.reportDate,
      expectedQuarterLabel: expected.quarterLabel,
      quartersBehind: 0,
      expectedDeadline: expected.deadline,
      nextDeadline,
      label: `Early ${quarterLabelFromReportDate(reportDate)} filing`,
    };
  }

  if (reported.getTime() === expectedDate.getTime()) {
    return {
      status: "current",
      expectedReportDate: expected.reportDate,
      expectedQuarterLabel: expected.quarterLabel,
      quartersBehind: 0,
      expectedDeadline: expected.deadline,
      nextDeadline,
      label: `On latest period (${expected.quarterLabel})`,
    };
  }

  const behind = quartersBetween(reported, expectedDate);
  return {
    status: "behind",
    expectedReportDate: expected.reportDate,
    expectedQuarterLabel: expected.quarterLabel,
    quartersBehind: behind,
    expectedDeadline: expected.deadline,
    nextDeadline,
    label:
      behind === 1
        ? `Still on prior quarter — ${expected.quarterLabel} expected`
        : `${behind} quarters behind — ${expected.quarterLabel} expected`,
  };
}

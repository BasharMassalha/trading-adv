/**
 * Shared limits and helpers for the no-sign-in free trial.
 */

export const GUEST_TRIAL = {
  maxPortfolios: 1,
  maxHoldings: 25,
  maxAnalyzeRuns: 1,
  /** Guest account lifetime from creation */
  ttlMs: 60 * 60 * 24 * 1000,
  /** Max guest session creations per IP per window */
  createPerIp: 5,
  createWindowMs: 60 * 60 * 1000,
  emailDomain: "trial.local",
} as const;

export function isGuestTrialEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${GUEST_TRIAL.emailDomain}`);
}

export function guestEmailForId(userId: string): string {
  return `guest_${userId}@${GUEST_TRIAL.emailDomain}`;
}

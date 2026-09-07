import { randomBytes } from "crypto";
import { AppError } from "@/lib/errors";
import { createSession, getSession, destroySession } from "@/lib/auth";
import { GUEST_TRIAL, guestEmailForId } from "@/lib/guest-trial";
import { prisma } from "@/lib/prisma";
import { userRepository } from "@/server/repositories/user.repository";
import { portfolioRepository } from "@/server/repositories/portfolio.repository";
import { aiReportRepository } from "@/server/repositories/ai-report.repository";

function newGuestId() {
  return `g_${randomBytes(12).toString("hex")}`;
}

/** Simple in-memory IP rate limit for guest creation (per server instance). */
const guestCreateHits = new Map<string, number[]>();

function assertGuestCreateRateLimit(ip: string) {
  const now = Date.now();
  const windowStart = now - GUEST_TRIAL.createWindowMs;
  const recent = (guestCreateHits.get(ip) ?? []).filter((t) => t > windowStart);
  if (recent.length >= GUEST_TRIAL.createPerIp) {
    throw new AppError({
      message: "Too many free trials from this network. Try again later or sign up.",
      status: 429,
      code: "RATE_LIMITED",
    });
  }
  recent.push(now);
  guestCreateHits.set(ip, recent);
}

/**
 * Guest trial orchestration: create ephemeral users, enforce caps, and
 * merge/upgrade into real accounts on sign-up / sign-in.
 */
export const guestTrialService = {
  /**
   * Create a guest session (or refresh an existing valid guest session).
   * Idempotent for the same browser cookie.
   */
  async startTrial(ip: string) {
    const existing = await getSession();

    if (existing && !existing.isGuest) {
      return {
        userId: existing.userId,
        isGuest: false as const,
        alreadyRegistered: true as const,
      };
    }

    if (existing?.isGuest) {
      const active = await userRepository.isGuestActive(existing.userId);
      if (active) {
        await createSession({
          userId: existing.userId,
          email: existing.email,
          name: existing.name,
          isGuest: true,
        });
        return {
          userId: existing.userId,
          isGuest: true as const,
          alreadyRegistered: false as const,
        };
      }
      await destroySession();
      try {
        await userRepository.delete(existing.userId);
      } catch {
        // Guest row may already be gone
      }
    }

    assertGuestCreateRateLimit(ip);

    const id = newGuestId();
    const email = guestEmailForId(id);
    const guestExpiresAt = new Date(Date.now() + GUEST_TRIAL.ttlMs);

    const user = await userRepository.create({
      id,
      email,
      name: "Guest",
      passwordHash: null,
      isGuest: true,
      guestExpiresAt,
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      isGuest: true,
    });

    return {
      userId: user.id,
      isGuest: true as const,
      alreadyRegistered: false as const,
    };
  },

  async assertGuestNotExpired(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user?.isGuest) return;
    if (user.guestExpiresAt && user.guestExpiresAt.getTime() < Date.now()) {
      throw new AppError({
        message: "Your free trial has expired. Sign up to continue.",
        status: 401,
        code: "TRIAL_EXPIRED",
      });
    }
  },

  async assertCanImport(userId: string, holdingCount: number) {
    const user = await userRepository.findById(userId);
    if (!user?.isGuest) return;

    await this.assertGuestNotExpired(userId);

    if (holdingCount > GUEST_TRIAL.maxHoldings) {
      throw new AppError({
        message: `Free trial is limited to ${GUEST_TRIAL.maxHoldings} holdings. Sign up for a full account.`,
        status: 400,
        code: "TRIAL_HOLDINGS_LIMIT",
      });
    }

    const portfolios = await portfolioRepository.listByUser(userId);
    if (portfolios.length >= GUEST_TRIAL.maxPortfolios) {
      // Allow re-import into the existing portfolio (replace), not a second book
      return { existingPortfolioId: portfolios[0]?.id ?? null };
    }
    return { existingPortfolioId: null };
  },

  async assertCanAnalyze(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user?.isGuest) return;

    await this.assertGuestNotExpired(userId);

    const reports = await aiReportRepository.listByUser(userId, 50);
    const started = reports.filter(
      (r) =>
        r.status === "READY" ||
        r.status === "GENERATING" ||
        r.status === "PENDING",
    );
    if (started.length >= GUEST_TRIAL.maxAnalyzeRuns) {
      throw new AppError({
        message:
          "You've used your free analysis. Sign up to run more analyses and ask follow-ups.",
        status: 401,
        code: "TRIAL_SIGNUP_REQUIRED",
      });
    }
  },

  /**
   * Upgrade a guest row in place to a registered user (keeps portfolios / reports).
   */
  async upgradeGuestInPlace(params: {
    guestUserId: string;
    email: string;
    name?: string | null;
    passwordHash?: string | null;
    image?: string | null;
  }) {
    return userRepository.update(params.guestUserId, {
      email: params.email,
      name: params.name ?? undefined,
      passwordHash: params.passwordHash ?? null,
      image: params.image ?? undefined,
      isGuest: false,
      guestExpiresAt: null,
    });
  },

  /**
   * Move guest portfolios and reports onto an existing registered user, then
   * delete the guest row.
   */
  async mergeGuestIntoUser(guestUserId: string, targetUserId: string) {
    if (guestUserId === targetUserId) return;

    await prisma.$transaction(async (tx) => {
      await tx.portfolio.updateMany({
        where: { userId: guestUserId },
        data: { userId: targetUserId },
      });
      await tx.aIReport.updateMany({
        where: { userId: guestUserId },
        data: { userId: targetUserId },
      });
      await tx.userInvestmentProfile.deleteMany({
        where: { userId: guestUserId },
      });
      await tx.user.delete({ where: { id: guestUserId } });
    });
  },

  async conversionRedirect(userId: string): Promise<string> {
    const portfolios = await portfolioRepository.listByUser(userId);
    if (portfolios.length > 0) {
      return `/advisor?portfolio=${portfolios[0].id}`;
    }
    return "/dashboard";
  },
};

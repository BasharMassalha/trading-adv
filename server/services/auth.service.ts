import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { userRepository } from "@/server/repositories/user.repository";
import { guestTrialService } from "@/server/services/guest-trial.service";
import type { SignInInput, SignUpInput } from "@/server/validators/auth.validator";
import type { GoogleUserInfo } from "@/lib/google-oauth";

export type AuthResult = {
  id: string;
  email: string;
  name: string | null;
  convertedFromGuest: boolean;
  redirectTo: string;
};

/**
 * Auth service — orchestrates user registration / login and manages sessions.
 *
 * This is deliberately small for the scaffold. Swap it for NextAuth / Clerk
 * when real accounts are required.
 */
export const authService = {
  async signUp(input: SignUpInput): Promise<AuthResult> {
    const guestSession = await getSession();
    const existing = await userRepository.findByEmail(input.email);
    if (existing && !existing.isGuest) {
      throw new ConflictError("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    if (guestSession?.isGuest) {
      const active = await userRepository.isGuestActive(guestSession.userId);
      if (active) {
        if (existing && existing.id !== guestSession.userId) {
          throw new ConflictError("An account with this email already exists.");
        }
        const user = await guestTrialService.upgradeGuestInPlace({
          guestUserId: guestSession.userId,
          email: input.email,
          name: input.name,
          passwordHash,
        });
        await createSession({
          userId: user.id,
          email: user.email,
          name: user.name,
          isGuest: false,
        });
        const redirectTo = await guestTrialService.conversionRedirect(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          convertedFromGuest: true,
          redirectTo,
        };
      }
    }

    const user = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      isGuest: false,
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      convertedFromGuest: false,
      redirectTo: "/onboarding",
    };
  },

  async signIn(input: SignInInput): Promise<AuthResult> {
    const guestSession = await getSession();
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.passwordHash || user.isGuest) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    let convertedFromGuest = false;
    if (guestSession?.isGuest && guestSession.userId !== user.id) {
      const active = await userRepository.isGuestActive(guestSession.userId);
      if (active) {
        await guestTrialService.mergeGuestIntoUser(
          guestSession.userId,
          user.id,
        );
        convertedFromGuest = true;
      }
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      isGuest: false,
    });

    const redirectTo = convertedFromGuest
      ? await guestTrialService.conversionRedirect(user.id)
      : "/dashboard";

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      convertedFromGuest,
      redirectTo,
    };
  },

  async signOut() {
    await destroySession();
  },

  /**
   * Sign in or register via Google OAuth userinfo (email must be verified by Google).
   * If the email already exists (password or prior OAuth), we sign in and refresh name/image when useful.
   * Guest trials are upgraded in place (new Google user) or merged (existing account).
   */
  async signInWithGoogle(info: GoogleUserInfo): Promise<AuthResult & { isNew: boolean }> {
    if (!info.email) {
      throw new UnauthorizedError("Google did not return an email address.");
    }
    if (!info.verified_email) {
      throw new UnauthorizedError(
        "Your Google email is not verified. Please verify it and try again.",
      );
    }

    const guestSession = await getSession();
    const email = info.email.toLowerCase().trim();
    const existing = await userRepository.findByEmailLoose(email);

    if (existing && !existing.isGuest) {
      const name = existing.name ?? info.name ?? null;
      if (
        (info.name && existing.name !== info.name) ||
        (info.picture && existing.image !== info.picture)
      ) {
        await userRepository.update(existing.id, {
          name: info.name ?? existing.name,
          image: info.picture ?? existing.image,
        });
      }

      let convertedFromGuest = false;
      if (guestSession?.isGuest && guestSession.userId !== existing.id) {
        const active = await userRepository.isGuestActive(guestSession.userId);
        if (active) {
          await guestTrialService.mergeGuestIntoUser(
            guestSession.userId,
            existing.id,
          );
          convertedFromGuest = true;
        }
      }

      await createSession({
        userId: existing.id,
        email: existing.email,
        name: name ?? info.name ?? null,
        isGuest: false,
      });

      const redirectTo = convertedFromGuest
        ? await guestTrialService.conversionRedirect(existing.id)
        : "/dashboard";

      return {
        isNew: false,
        id: existing.id,
        email: existing.email,
        name: name ?? info.name ?? null,
        convertedFromGuest,
        redirectTo,
      };
    }

    // New Google account — upgrade guest in place when possible
    if (guestSession?.isGuest) {
      const active = await userRepository.isGuestActive(guestSession.userId);
      if (active) {
        const user = await guestTrialService.upgradeGuestInPlace({
          guestUserId: guestSession.userId,
          email,
          name: info.name ?? null,
          passwordHash: null,
          image: info.picture ?? null,
        });
        await createSession({
          userId: user.id,
          email: user.email,
          name: user.name,
          isGuest: false,
        });
        const redirectTo = await guestTrialService.conversionRedirect(user.id);
        return {
          isNew: true,
          id: user.id,
          email: user.email,
          name: user.name,
          convertedFromGuest: true,
          redirectTo,
        };
      }
    }

    const user = await userRepository.create({
      email,
      name: info.name ?? null,
      image: info.picture ?? null,
      passwordHash: null,
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      isGuest: false,
    });

    return {
      isNew: true,
      id: user.id,
      email: user.email,
      name: user.name,
      convertedFromGuest: false,
      redirectTo: "/onboarding",
    };
  },
};

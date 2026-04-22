import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import { createSession, destroySession } from "@/lib/auth";
import { userRepository } from "@/server/repositories/user.repository";
import type { SignInInput, SignUpInput } from "@/server/validators/auth.validator";
import type { GoogleUserInfo } from "@/lib/google-oauth";

/**
 * Auth service — orchestrates user registration / login and manages sessions.
 *
 * This is deliberately small for the scaffold. Swap it for NextAuth / Clerk
 * when real accounts are required.
 */
export const authService = {
  async signUp(input: SignUpInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });

    await createSession({ userId: user.id, email: user.email, name: user.name });
    return { id: user.id, email: user.email, name: user.name };
  },

  async signIn(input: SignInInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    await createSession({ userId: user.id, email: user.email, name: user.name });
    return { id: user.id, email: user.email, name: user.name };
  },

  async signOut() {
    await destroySession();

  },

  /**
   * Sign in or register via Google OAuth userinfo (email must be verified by Google).
   * If the email already exists (password or prior OAuth), we sign in and refresh name/image when useful.
   */
  async signInWithGoogle(info: GoogleUserInfo) {
    if (!info.email) {
      throw new UnauthorizedError("Google did not return an email address.");
    }
    if (!info.verified_email) {
      throw new UnauthorizedError("Your Google email is not verified. Please verify it and try again.");
    }

    const email = info.email.toLowerCase().trim();
    const existing = await userRepository.findByEmailLoose(email);

    if (existing) {
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
      await createSession({
        userId: existing.id,
        email: existing.email,
        name: name ?? info.name ?? null,
      });
      return {
        isNew: false as const,
        id: existing.id,
        email: existing.email,
        name: name ?? info.name ?? null,
      };
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
    });
    return {
      isNew: true as const,
      id: user.id,
      email: user.email,
      name: user.name,
    };
  },
};

import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import { createSession, destroySession } from "@/lib/auth";
import { userRepository } from "@/server/repositories/user.repository";
import type { SignInInput, SignUpInput } from "@/server/validators/auth.validator";

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
};

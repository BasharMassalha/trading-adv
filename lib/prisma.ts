import { neonConfig, Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

/**
 * Neon over WebSockets (port 443) instead of Prisma's TCP engine on 5432.
 * Prisma's Rust client prefers IPv6 and some Neon A records never complete
 * a Postgres handshake from Windows, which shows up as P1001 / connection
 * resets. The serverless driver uses Node's HTTP stack and recovers.
 */
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = false;

function neonConnectionString(raw: string): string {
  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  url.searchParams.delete("hostaddr");
  url.searchParams.delete("pgbouncer");
  url.searchParams.delete("pool_timeout");
  url.searchParams.delete("connection_limit");
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  neonPool: Pool | undefined;
};

function createPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 5,
    // Recycle before Neon/pgbouncer kills idle sockets (uncaughtException).
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
  });
  pool.on("error", (err) => {
    console.warn("[db] Neon connection dropped:", err.message);
  });
  return pool;
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalForPrisma.neonPool ??
    createPool(neonConnectionString(raw));
  globalForPrisma.neonPool = pool;

  return new PrismaClient({
    adapter: new PrismaNeon(pool),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

/**
 * Singleton Prisma client. In dev, Next.js HMR would otherwise create a new
 * client on every reload and exhaust connections.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Awaitable warm-up for instrumentation / workers. */
export async function initPrisma(): Promise<PrismaClient> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return prisma;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
}

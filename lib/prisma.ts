import { lookup } from "node:dns/promises";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma's Rust engine prefers AAAA (IPv6). On some Windows networks those
 * routes time out while IPv4 works, which surfaces as P1001 / pool timeouts.
 * Some Neon A records also accept TCP but never complete the Postgres
 * handshake from this network, so we probe IPv4 candidates and pin hostaddr
 * to the first one that answers `SELECT 1`.
 *
 * Node 24 removed dns.lookupSync, so URL normalization is async and the
 * exported client is a thin proxy until the real PrismaClient is ready.
 */
function withBaseParams(raw: string): URL {
  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  if (!url.searchParams.has("connect_timeout")) {
    url.searchParams.set("connect_timeout", "15");
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", "15");
  }
  return url;
}

const globalForHostaddr = globalThis as unknown as {
  neonHostaddrByHost?: Record<string, string>;
};

async function firstWorkingHostaddr(
  hostname: string,
  template: URL,
): Promise<string | undefined> {
  const cached = globalForHostaddr.neonHostaddrByHost?.[hostname];
  if (cached) return cached;

  let addresses: string[] = [];
  try {
    const results = await lookup(hostname, { family: 4, all: true });
    addresses = results.map((r) => r.address);
  } catch {
    return undefined;
  }
  if (addresses.length === 0) return undefined;

  const probe = async (address: string): Promise<string> => {
    const url = new URL(template.toString());
    url.searchParams.set("hostaddr", address);
    url.searchParams.set("connect_timeout", "8");
    url.searchParams.set("pool_timeout", "8");
    const client = new PrismaClient({
      datasources: { db: { url: url.toString() } },
    });
    try {
      await client.$queryRaw`SELECT 1`;
      return address;
    } finally {
      await client.$disconnect().catch(() => undefined);
    }
  };

  let hostaddr: string | undefined;
  try {
    hostaddr =
      addresses.length === 1
        ? await probe(addresses[0])
        : await Promise.any(addresses.map(probe));
  } catch {
    hostaddr = addresses[0];
  }

  if (hostaddr) {
    globalForHostaddr.neonHostaddrByHost = {
      ...globalForHostaddr.neonHostaddrByHost,
      [hostname]: hostaddr,
    };
  }
  return hostaddr;
}

async function normalizeDatabaseUrl(
  raw: string | undefined,
): Promise<string | undefined> {
  if (!raw) return raw;
  try {
    const url = withBaseParams(raw);
    if (url.hostname && !url.searchParams.has("hostaddr")) {
      const hostaddr = await firstWorkingHostaddr(url.hostname, url);
      if (hostaddr) url.searchParams.set("hostaddr", hostaddr);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaInit: Promise<PrismaClient> | undefined;
};

async function createPrismaClient(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const databaseUrl = await normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
  const directUrl = await normalizeDatabaseUrl(process.env.DIRECT_URL);
  if (directUrl) process.env.DIRECT_URL = directUrl;

  const client = new PrismaClient({
    // Pass URL explicitly so Prisma cannot clobber the IPv4 hostaddr rewrite
    // by reloading `.env` at engine startup.
    datasources: databaseUrl
      ? {
          db: { url: databaseUrl },
        }
      : undefined,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

  globalForPrisma.prisma = client;
  return client;
}

function getPrismaClient(): Promise<PrismaClient> {
  if (!globalForPrisma.prismaInit) {
    globalForPrisma.prismaInit = createPrismaClient();
  }
  return globalForPrisma.prismaInit;
}

/** Awaitable warm-up for instrumentation / workers. */
export function initPrisma(): Promise<PrismaClient> {
  return getPrismaClient();
}

function modelProxy(model: string): object {
  return new Proxy(
    {},
    {
      get(_target, method) {
        if (typeof method !== "string") return undefined;
        return (...args: unknown[]) =>
          getPrismaClient().then((client) => {
            const delegate = (client as unknown as Record<string, any>)[model];
            return delegate[method](...args);
          });
      },
    },
  );
}

/**
 * Singleton Prisma client. In dev, Next.js HMR would otherwise create a new
 * client on every reload and exhaust connections.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    // Avoid being treated as a thenable by await/Promise logic.
    if (prop === "then") return undefined;
    if (typeof prop !== "string") return undefined;

    if (globalForPrisma.prisma) {
      const value = (globalForPrisma.prisma as unknown as Record<string, unknown>)[
        prop
      ];
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(globalForPrisma.prisma)
        : value;
    }

    if (prop.startsWith("$")) {
      return (...args: unknown[]) =>
        getPrismaClient().then((client) =>
          (client as unknown as Record<string, (...a: unknown[]) => unknown>)[
            prop
          ](...args),
        );
    }

    return modelProxy(prop);
  },
});

// Start resolving IPv4 + client as soon as this module loads on Node.
if (process.env.NEXT_RUNTIME !== "edge") {
  void getPrismaClient();
}

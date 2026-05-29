import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

const CLIENT_METHODS = new Set([
  "$connect",
  "$disconnect",
  "$transaction",
  "$queryRaw",
  "$executeRaw",
  "$queryRawUnsafe",
  "$executeRawUnsafe",
]);

const CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

function isConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (CONNECTION_ERROR_CODES.has(error.code)) return true;
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: string }).code);
    if (CONNECTION_ERROR_CODES.has(code)) return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("closed the connection") ||
      msg.includes("connection terminated") ||
      msg.includes("econnreset") ||
      msg.includes("connection refused") ||
      msg.includes("timeout") ||
      msg.includes("can't reach database") ||
      msg.includes("connection pool")
    );
  }
  return false;
}

export function resetPrismaClient() {
  const pool = globalForPrisma.pgPool;
  globalForPrisma.prisma = undefined;
  globalForPrisma.pgPool = undefined;
  if (pool) {
    void pool.end().catch(() => undefined);
  }
}

function getPool() {
  if (!globalForPrisma.pgPool) {
    const isDev = process.env.NODE_ENV === "development";
    globalForPrisma.pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: isDev ? 3 : 10,
      idleTimeoutMillis: isDev ? 30_000 : 20_000,
      connectionTimeoutMillis: 10_000,
      // 開發用 prisma dev：過短的 maxLifetime 會讓 pool 持有已被伺服器關閉的連線
      maxLifetimeSeconds: isDev ? 0 : 300,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });
    globalForPrisma.pgPool.on("error", (err) => {
      console.error("[prisma] PostgreSQL pool error, resetting:", err.message);
      resetPrismaClient();
    });
  }
  return globalForPrisma.pgPool;
}

function createPrismaClient() {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** 連線中斷時自動重建 pool 並重試（開發用 prisma dev 較常見） */
async function warmPool(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

export async function withPrisma<T>(
  fn: (db: PrismaClient) => Promise<T>,
  retries = 4,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(getPrismaClient());
    } catch (error) {
      lastError = error;
      if (!isConnectionError(error) || attempt === retries) {
        throw error;
      }
      resetPrismaClient();
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      try {
        await warmPool(getPool());
      } catch {
        resetPrismaClient();
      }
    }
  }
  throw lastError;
}

function isModelDelegate(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { findMany?: unknown }).findMany === "function"
  );
}

function createRetriedModel(modelName: string) {
  return new Proxy(
    {},
    {
      get(_target, method) {
        if (typeof method !== "string") return undefined;
        return (...args: unknown[]) =>
          withPrisma(async (db) => {
            const model = (db as unknown as Record<string, Record<string, unknown>>)[modelName];
            const fn = model[method];
            if (typeof fn !== "function") {
              throw new Error(`prisma.${modelName}.${method} is not a function`);
            }
            return fn.apply(model, args);
          });
      },
    },
  );
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (typeof prop !== "string") {
      return undefined;
    }

    const client = getPrismaClient();
    const value = (client as unknown as Record<string, unknown>)[prop];

    if (CLIENT_METHODS.has(prop) && typeof value === "function") {
      return (...args: unknown[]) =>
        withPrisma(async (db) => {
          const fn = (db as unknown as Record<string, unknown>)[prop];
          return (fn as (...a: unknown[]) => Promise<unknown>).apply(db, args);
        });
    }

    if (isModelDelegate(value)) {
      return createRetriedModel(prop);
    }

    return value;
  },
});

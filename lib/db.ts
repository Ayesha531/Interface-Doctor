/**
 * Server-side Postgres connection pool.
 *
 * The pool is created only when DATABASE_URL is present. All database access
 * is isolated to server code (API routes); this module is never imported by
 * client components.
 */

import { Pool } from "pg";

let pool: Pool | null = null;
let loggedUnavailable = false;

export function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;

  if (!pool) {
    // eslint-disable-next-line no-console
    console.log("[db] Creating Postgres pool from DATABASE_URL.");
    pool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5000,
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });

    pool.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("Unexpected Postgres pool error", err.message);
    });
  }

  return pool;
}

export interface DbHealth {
  available: boolean;
  reason?: "missing_url" | "connection_failed";
  error?: string;
}

/** Test whether the database is reachable without leaking the connection string. */
export async function checkDbHealth(): Promise<DbHealth> {
  const poolInstance = getPool();
  if (!poolInstance) {
    if (!loggedUnavailable) {
      loggedUnavailable = true;
      // eslint-disable-next-line no-console
      console.log("[db] DATABASE_URL is not set; project persistence will use localStorage.");
    }
    return { available: false, reason: "missing_url" };
  }

  try {
    await poolInstance.query("select 1 as health");
    if (loggedUnavailable) {
      loggedUnavailable = false;
      // eslint-disable-next-line no-console
      console.log("[db] Postgres connection verified.");
    }
    return { available: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    if (!loggedUnavailable) {
      loggedUnavailable = true;
      // eslint-disable-next-line no-console
      console.log(`[db] Postgres connection failed: ${message}`);
    }
    return { available: false, reason: "connection_failed", error: message };
  }
}

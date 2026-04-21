import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export const pool =
  globalThis._pgPool ??
  new Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "melgarbot",
    user: process.env.PGUSER || "melgar",
    password: process.env.PGPASSWORD || "melgar_dev_pw",
  });

if (process.env.NODE_ENV !== "production") globalThis._pgPool = pool;

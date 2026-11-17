import { Pool, QueryResult, QueryResultRow } from 'pg';

const globalForPg = globalThis as unknown as {
  pool: Pool | undefined;
};

// Export 'pool' so route handlers can manage client connections and transactions
export const pool =
  globalForPg.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pool = pool;
}

// Export 'db' for standard query calls
export const db = {
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return pool.query<T>(text, params);
  },
};
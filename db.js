import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credentials (
      id BIGSERIAL PRIMARY KEY,
      certificate_id TEXT UNIQUE NOT NULL,
      encrypted_payload TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      document_hash TEXT NOT NULL,
      blockchain_tx TEXT NOT NULL,
      blockchain_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id BIGSERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      certificate_id TEXT,
      event_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

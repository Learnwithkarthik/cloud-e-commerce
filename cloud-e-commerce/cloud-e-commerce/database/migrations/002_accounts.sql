-- Additive migration: safe for existing PostgreSQL data. Run once after taking a backup.
BEGIN;
CREATE TABLE IF NOT EXISTS customer_accounts (
    id BIGSERIAL PRIMARY KEY,
    display_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customer_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_user ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry ON customer_sessions(expires_at);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customer_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at DESC);
COMMIT;

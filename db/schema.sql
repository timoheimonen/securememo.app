-- Memos table for encrypted message storage
CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memo_id TEXT UNIQUE NOT NULL,
    encrypted_message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_time INTEGER,
    deletion_token_hash TEXT
);

-- Index on memo_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_memos_memo_id ON memos(memo_id);

-- Index on expiry_time for cleanup operations
CREATE INDEX IF NOT EXISTS idx_memos_expiry_time ON memos(expiry_time); 
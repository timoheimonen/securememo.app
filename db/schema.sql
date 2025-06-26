-- Memos table for secure messages
CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memo_id TEXT UNIQUE NOT NULL,
    encrypted_message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_time DATETIME,
    is_read BOOLEAN DEFAULT FALSE
);

-- Create index on memo_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_memos_memo_id ON memos(memo_id);

-- Create index on expiry_time for cleanup operations
CREATE INDEX IF NOT EXISTS idx_memos_expiry_time ON memos(expiry_time); 
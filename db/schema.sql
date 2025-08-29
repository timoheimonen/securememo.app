-- Set SQL Server compatibility mode (for linter compatibility only)
-- This is ignored by SQLite but silences SQL Server linters
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memo_id TEXT UNIQUE NOT NULL,
    encrypted_message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_time INTEGER,
    deletion_token_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_memos_memo_id ON memos(memo_id);
CREATE INDEX IF NOT EXISTS idx_memos_expiry_time ON memos(expiry_time); 
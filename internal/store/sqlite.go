package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type SQLiteStore struct {
	db *sql.DB
}

type Memo struct {
	ID                string
	EncryptedMessage  string
	DeletionTokenHash string
}

type CleanupResult struct {
	MemosDeleted      int64
	RateLimitsDeleted int64
}

const (
	AppStatMemosCreated = "memos_created_total"
	AppStatMemosRead    = "memos_read_total"
)

type AppStats struct {
	MemosCreated uint64
	MemosRead    uint64
}

var ErrNotFound = errors.New("not found")

func OpenSQLite(path string) (*SQLiteStore, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, err
	}

	values := url.Values{}
	values.Set("_busy_timeout", "5000")
	values.Set("_foreign_keys", "on")
	values.Set("_journal_mode", "WAL")
	values.Set("_secure_delete", "FAST")
	values.Set("_synchronous", "NORMAL")

	db, err := sql.Open("sqlite3", fmt.Sprintf("file:%s?%s", path, values.Encode()))
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	store := &SQLiteStore{db: db}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := store.migrate(ctx); err != nil {
		db.Close()
		return nil, err
	}
	return store, nil
}

func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

func (s *SQLiteStore) migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
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

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    first_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);

CREATE TABLE IF NOT EXISTS app_stats (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
);
`)
	return err
}

func (s *SQLiteStore) IncrementAppStat(ctx context.Context, key string) error {
	if !validAppStatKey(key) {
		return fmt.Errorf("unknown app stat key: %s", key)
	}
	now := time.Now().Unix()
	_, err := s.db.ExecContext(ctx, `
INSERT INTO app_stats (key, value, updated_at)
VALUES (?, 1, ?)
ON CONFLICT(key) DO UPDATE SET
    value = value + 1,
    updated_at = excluded.updated_at`, key, now)
	return err
}

func (s *SQLiteStore) AppStats(ctx context.Context) (AppStats, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT key, value FROM app_stats WHERE key IN (?, ?)`, AppStatMemosCreated, AppStatMemosRead)
	if err != nil {
		return AppStats{}, err
	}
	defer rows.Close()

	var stats AppStats
	for rows.Next() {
		var key string
		var value uint64
		if err := rows.Scan(&key, &value); err != nil {
			return AppStats{}, err
		}
		switch key {
		case AppStatMemosCreated:
			stats.MemosCreated = value
		case AppStatMemosRead:
			stats.MemosRead = value
		}
	}
	if err := rows.Err(); err != nil {
		return AppStats{}, err
	}
	return stats, nil
}

func validAppStatKey(key string) bool {
	switch key {
	case AppStatMemosCreated, AppStatMemosRead:
		return true
	default:
		return false
	}
}

func (s *SQLiteStore) MemoExists(ctx context.Context, memoID string) (bool, error) {
	var exists int
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM memos WHERE memo_id = ? LIMIT 1`, memoID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (s *SQLiteStore) CreateMemo(ctx context.Context, memoID, encryptedMessage string, expiryTime int64, deletionTokenHash string) error {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO memos (memo_id, encrypted_message, expiry_time, deletion_token_hash)
VALUES (?, ?, ?, ?)`, memoID, encryptedMessage, expiryTime, deletionTokenHash)
	return err
}

func (s *SQLiteStore) ReadActiveMemo(ctx context.Context, memoID string) (Memo, error) {
	var memo Memo
	err := s.db.QueryRowContext(ctx, `
SELECT memo_id, encrypted_message, deletion_token_hash
FROM memos
WHERE memo_id = ?
AND (expiry_time IS NULL OR expiry_time > unixepoch('now'))`, memoID).Scan(
		&memo.ID,
		&memo.EncryptedMessage,
		&memo.DeletionTokenHash,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Memo{}, ErrNotFound
	}
	if err != nil {
		return Memo{}, err
	}
	return memo, nil
}

func (s *SQLiteStore) DeleteMemo(ctx context.Context, memoID string) (bool, error) {
	result, err := s.db.ExecContext(ctx, `DELETE FROM memos WHERE memo_id = ?`, memoID)
	if err != nil {
		return false, err
	}
	changes, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return changes > 0, nil
}

func (s *SQLiteStore) Cleanup(ctx context.Context) (CleanupResult, error) {
	var out CleanupResult
	result, err := s.db.ExecContext(ctx, `
DELETE FROM memos
WHERE expiry_time IS NOT NULL
AND expiry_time < unixepoch('now')`)
	if err != nil {
		return out, err
	}
	out.MemosDeleted, _ = result.RowsAffected()

	result, err = s.db.ExecContext(ctx, `
DELETE FROM rate_limits
WHERE expires_at < unixepoch('now')`)
	if err != nil {
		return out, err
	}
	out.RateLimitsDeleted, _ = result.RowsAffected()
	return out, nil
}

type RateLimitResult struct {
	Limited    bool
	Count      int
	Remaining  int
	RetryAfter time.Duration
}

func (s *SQLiteStore) RecordEvent(ctx context.Context, key string, limit int, window time.Duration) (RateLimitResult, error) {
	if limit <= 0 {
		return RateLimitResult{}, errors.New("limit must be positive")
	}
	now := time.Now().Unix()
	expiresAt := now + int64(window.Seconds())

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return RateLimitResult{}, err
	}
	defer tx.Rollback()

	var count int
	var currentExpiresAt int64
	err = tx.QueryRowContext(ctx, `SELECT count, expires_at FROM rate_limits WHERE key = ?`, key).Scan(&count, &currentExpiresAt)
	if errors.Is(err, sql.ErrNoRows) || currentExpiresAt <= now {
		_, err = tx.ExecContext(ctx, `
INSERT INTO rate_limits (key, count, first_seen, updated_at, expires_at)
VALUES (?, 1, ?, ?, ?)
ON CONFLICT(key) DO UPDATE SET
    count = excluded.count,
    first_seen = excluded.first_seen,
    updated_at = excluded.updated_at,
    expires_at = excluded.expires_at`, key, now, now, expiresAt)
		if err != nil {
			return RateLimitResult{}, err
		}
		if err := tx.Commit(); err != nil {
			return RateLimitResult{}, err
		}
		return RateLimitResult{Limited: false, Count: 1, Remaining: max(0, limit-1)}, nil
	}
	if err != nil {
		return RateLimitResult{}, err
	}

	next := count + 1
	if next > limit {
		if err := tx.Commit(); err != nil {
			return RateLimitResult{}, err
		}
		retryAfter := time.Duration(max(1, int(currentExpiresAt-now))) * time.Second
		return RateLimitResult{Limited: true, Count: count, Remaining: 0, RetryAfter: retryAfter}, nil
	}

	_, err = tx.ExecContext(ctx, `
UPDATE rate_limits
SET count = ?, updated_at = ?
WHERE key = ?`, next, now, key)
	if err != nil {
		return RateLimitResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return RateLimitResult{}, err
	}
	return RateLimitResult{Limited: false, Count: next, Remaining: max(0, limit-next)}, nil
}

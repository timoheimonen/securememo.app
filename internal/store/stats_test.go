package store

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"
)

func TestAppStatsPersistAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "securememo.sqlite")
	ctx := context.Background()

	db, err := OpenSQLite(path)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.IncrementAppStat(ctx, AppStatMemosCreated); err != nil {
		t.Fatalf("increment created: %v", err)
	}
	if err := db.IncrementAppStat(ctx, AppStatMemosCreated); err != nil {
		t.Fatalf("increment created again: %v", err)
	}
	if err := db.IncrementAppStat(ctx, AppStatMemosRead); err != nil {
		t.Fatalf("increment read: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close sqlite: %v", err)
	}

	reopened, err := OpenSQLite(path)
	if err != nil {
		t.Fatalf("reopen sqlite: %v", err)
	}
	defer reopened.Close()

	stats, err := reopened.AppStats(ctx)
	if err != nil {
		t.Fatalf("read app stats: %v", err)
	}
	if stats.MemosCreated != 2 {
		t.Fatalf("MemosCreated = %d, want 2", stats.MemosCreated)
	}
	if stats.MemosRead != 1 {
		t.Fatalf("MemosRead = %d, want 1", stats.MemosRead)
	}
}

func TestIncrementAppStatRejectsUnknownKey(t *testing.T) {
	db, err := OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	if err := db.IncrementAppStat(context.Background(), "memo-id-or-other-unbounded-value"); err == nil {
		t.Fatal("expected unknown app stat key to be rejected")
	}
}

func TestOpenSQLiteMigratesOwnerDeletionTokenHashColumn(t *testing.T) {
	path := filepath.Join(t.TempDir(), "securememo.sqlite")
	ctx := context.Background()

	raw, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatalf("open raw sqlite: %v", err)
	}
	_, err = raw.ExecContext(ctx, `
CREATE TABLE memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memo_id TEXT UNIQUE NOT NULL,
    encrypted_message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_time INTEGER,
    deletion_token_hash TEXT
)`)
	if err != nil {
		t.Fatalf("create old memos table: %v", err)
	}
	if err := raw.Close(); err != nil {
		t.Fatalf("close raw sqlite: %v", err)
	}

	db, err := OpenSQLite(path)
	if err != nil {
		t.Fatalf("open migrated sqlite: %v", err)
	}
	defer db.Close()

	memoID := "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn"
	ownerHash := "owner-deletion-token-hash"
	if err := db.CreateMemo(ctx, memoID, "ciphertext", time.Now().Add(time.Hour).Unix(), "deletion-hash", ownerHash); err != nil {
		t.Fatalf("create migrated memo: %v", err)
	}
	memo, err := db.ReadActiveMemo(ctx, memoID)
	if err != nil {
		t.Fatalf("read migrated memo: %v", err)
	}
	if memo.OwnerDeletionTokenHash != ownerHash {
		t.Fatalf("OwnerDeletionTokenHash = %q, want %q", memo.OwnerDeletionTokenHash, ownerHash)
	}
}

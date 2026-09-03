package store

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

func TestFreshSchemaDoesNotCreatePersistentRateLimits(t *testing.T) {
	db, err := OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), StorageLimits{})
	if err != nil {
		t.Fatalf("OpenSQLite: %v", err)
	}
	defer db.Close()

	assertNoRateLimitTable(t, db.db)
}

func TestSchemaV2DropsLegacyPersistentRateLimits(t *testing.T) {
	path := filepath.Join(t.TempDir(), "securememo.sqlite")
	legacy, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatalf("open legacy sqlite: %v", err)
	}
	if _, err := legacy.Exec(`
CREATE TABLE rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    first_seen INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX idx_rate_limits_expires_at ON rate_limits(expires_at);
PRAGMA user_version = 1;
`); err != nil {
		legacy.Close()
		t.Fatalf("seed legacy schema: %v", err)
	}
	tx, err := legacy.Begin()
	if err != nil {
		legacy.Close()
		t.Fatalf("begin legacy seed: %v", err)
	}
	stmt, err := tx.Prepare(`
INSERT INTO rate_limits (key, count, first_seen, updated_at, expires_at)
VALUES (?, 1, 1, 1, 9999999999)`)
	if err != nil {
		tx.Rollback()
		legacy.Close()
		t.Fatalf("prepare legacy seed: %v", err)
	}
	for index := 0; index < 4000; index++ {
		prefix := "LIVE_IDENTITY"
		if index < 2000 {
			prefix = "HISTORIC_DELETED_IDENTITY"
		}
		key := fmt.Sprintf("api:read:minute:%s_%06d_sensitive-rate-limit", prefix, index)
		if _, err := stmt.Exec(key); err != nil {
			stmt.Close()
			tx.Rollback()
			legacy.Close()
			t.Fatalf("insert legacy seed %d: %v", index, err)
		}
	}
	if err := stmt.Close(); err != nil {
		tx.Rollback()
		legacy.Close()
		t.Fatalf("close legacy seed statement: %v", err)
	}
	if err := tx.Commit(); err != nil {
		legacy.Close()
		t.Fatalf("commit legacy seed: %v", err)
	}
	if _, err := legacy.Exec(`PRAGMA secure_delete = FAST`); err != nil {
		legacy.Close()
		t.Fatalf("enable legacy fast secure delete: %v", err)
	}
	if _, err := legacy.Exec(`DELETE FROM rate_limits WHERE key LIKE '%HISTORIC_DELETED_IDENTITY%'`); err != nil {
		legacy.Close()
		t.Fatalf("delete historical legacy rows: %v", err)
	}
	if err := legacy.Close(); err != nil {
		t.Fatalf("close legacy sqlite: %v", err)
	}
	assertFileContains(t, path, []byte("LIVE_IDENTITY"))
	assertFileContains(t, path, []byte("HISTORIC_DELETED_IDENTITY"))

	db, err := OpenSQLite(path, StorageLimits{})
	if err != nil {
		t.Fatalf("migrate sqlite: %v", err)
	}
	defer db.Close()

	assertNoRateLimitTable(t, db.db)
	var version int
	if err := db.db.QueryRowContext(context.Background(), `PRAGMA user_version`).Scan(&version); err != nil {
		t.Fatalf("read schema version: %v", err)
	}
	if version != sqliteSchemaVersion {
		t.Fatalf("schema version = %d, want %d", version, sqliteSchemaVersion)
	}
	assertFilesDoNotContain(t, []byte("LIVE_IDENTITY"), path, path+"-wal", path+"-journal")
	assertFilesDoNotContain(t, []byte("HISTORIC_DELETED_IDENTITY"), path, path+"-wal", path+"-journal")
	var freelistPages int64
	if err := db.db.QueryRowContext(context.Background(), `PRAGMA freelist_count`).Scan(&freelistPages); err != nil {
		t.Fatalf("read freelist count: %v", err)
	}
	if freelistPages != 0 {
		t.Fatalf("freelist pages after legacy scrub = %d, want 0", freelistPages)
	}
}

func TestLegacyRateLimitScrubChecksVacuumCapacityBeforeDrop(t *testing.T) {
	path := filepath.Join(t.TempDir(), "securememo.sqlite")
	db, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatalf("open legacy sqlite: %v", err)
	}
	defer db.Close()
	if _, err := db.Exec(`CREATE TABLE rate_limits (key TEXT PRIMARY KEY)`); err != nil {
		t.Fatalf("create legacy table: %v", err)
	}
	pageSize, pageCount, _, err := sqlitePageStats(context.Background(), db)
	if err != nil {
		t.Fatalf("read legacy database size: %v", err)
	}
	databaseBytes, err := checkedProduct(pageSize, pageCount)
	if err != nil {
		t.Fatalf("calculate legacy database size: %v", err)
	}
	store := &SQLiteStore{
		db:     db,
		path:   path,
		limits: StorageLimits{MinFreeDiskBytes: 1},
		availableDiskBytes: func(string) (int64, error) {
			return databaseBytes + 1, nil
		},
	}
	if err := store.removeLegacyRateLimits(context.Background(), true); !errors.Is(err, ErrStorageLimitReached) {
		t.Fatalf("capacity error = %v, want %v", err, ErrStorageLimitReached)
	}
	var tableCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'rate_limits'`).Scan(&tableCount); err != nil {
		t.Fatalf("inspect legacy table: %v", err)
	}
	if tableCount != 1 {
		t.Fatalf("legacy table count after capacity failure = %d, want 1", tableCount)
	}
}

func assertNoRateLimitTable(t *testing.T, db *sql.DB) {
	t.Helper()
	var count int
	if err := db.QueryRowContext(context.Background(), `
SELECT COUNT(*)
FROM sqlite_master
WHERE type IN ('table', 'index')
  AND name IN ('rate_limits', 'idx_rate_limits_expires_at')`).Scan(&count); err != nil {
		t.Fatalf("inspect rate-limit schema: %v", err)
	}
	if count != 0 {
		t.Fatalf("persistent rate-limit schema objects = %d, want 0", count)
	}
}

func assertFileContains(t *testing.T, path string, marker []byte) {
	t.Helper()
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	if !bytes.Contains(contents, marker) {
		t.Fatalf("legacy fixture %s does not contain marker", path)
	}
}

func assertFilesDoNotContain(t *testing.T, marker []byte, paths ...string) {
	t.Helper()
	for _, path := range paths {
		contents, err := os.ReadFile(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		if bytes.Contains(contents, marker) {
			t.Fatalf("legacy rate-limit marker remains recoverable in %s", path)
		}
	}
}

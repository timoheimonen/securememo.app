package store

import (
	"context"
	"path/filepath"
	"testing"
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

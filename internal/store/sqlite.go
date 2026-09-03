package store

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"math"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	sqlite3 "github.com/mattn/go-sqlite3"
)

type SQLiteStore struct {
	db                 *sql.DB
	path               string
	limits             StorageLimits
	availableDiskBytes func(string) (int64, error)
}

type StorageLimits struct {
	MaxBytes         int64
	MaxMemos         int64
	MinFreeDiskBytes int64
}

type StorageStats struct {
	UsageBytes               int64
	LimitBytes               int64
	Memos                    int64
	MemosLimit               int64
	SQLiteMainBytes          int64
	SQLiteFreelistBytes      int64
	SQLiteWALBytes           int64
	FilesystemAvailableBytes int64
	MinFreeDiskBytes         int64
}

type Memo struct {
	ID                     string
	EncryptedMessage       string
	DeletionTokenHash      string
	OwnerDeletionTokenHash string
}

type CleanupResult struct {
	MemosDeleted int64
}

const (
	AppStatMemosCreated = "memos_created_total"
	AppStatMemosRead    = "memos_read_total"
)

type AppStats struct {
	MemosCreated uint64
	MemosRead    uint64
}

var (
	ErrNotFound            = errors.New("not found")
	ErrStorageLimitReached = errors.New("storage limit reached")
)

const (
	sqliteSchemaVersion        = 2
	maxSQLitePageCount         = int64(0xfffffffe)
	cleanupBatchSize           = 250
	attackerWriteHeadroomBytes = int64(1_000_000)
	sqliteStartupTimeout       = 10 * time.Minute
)

func OpenSQLite(path string, limits StorageLimits) (*SQLiteStore, error) {
	if err := limits.validate(); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, err
	}

	values := url.Values{}
	values.Set("_busy_timeout", "5000")
	values.Set("_foreign_keys", "on")
	values.Set("_journal_mode", "WAL")
	values.Set("_secure_delete", "FAST")
	values.Set("_synchronous", "NORMAL")
	values.Set("_txlock", "immediate")
	dsn := fmt.Sprintf("file:%s?%s", path, values.Encode())

	bootstrapDB, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}
	configurePool(bootstrapDB)

	bootstrapStore := &SQLiteStore{
		db:                 bootstrapDB,
		path:               path,
		limits:             limits,
		availableDiskBytes: filesystemAvailableBytes,
	}
	ctx, cancel := context.WithTimeout(context.Background(), sqliteStartupTimeout)
	defer cancel()
	if err := bootstrapStore.migrate(ctx); err != nil {
		bootstrapDB.Close()
		return nil, err
	}
	if err := bootstrapStore.reconcileStorageUsage(ctx); err != nil {
		bootstrapDB.Close()
		return nil, err
	}
	if err := bootstrapDB.Close(); err != nil {
		return nil, err
	}

	connector := &sqliteConnector{
		driver: &sqlite3.SQLiteDriver{ConnectHook: func(conn *sqlite3.SQLiteConn) error {
			return applyMaxPageCount(conn, limits.MaxBytes)
		}},
		dsn: dsn,
	}
	db := sql.OpenDB(connector)
	configurePool(db)
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}

	store := &SQLiteStore{
		db:                 db,
		path:               path,
		limits:             limits,
		availableDiskBytes: filesystemAvailableBytes,
	}
	return store, nil
}

func configurePool(db *sql.DB) {
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)
}

type sqliteConnector struct {
	driver *sqlite3.SQLiteDriver
	dsn    string
}

func (c *sqliteConnector) Connect(context.Context) (driver.Conn, error) {
	return c.driver.Open(c.dsn)
}

func (c *sqliteConnector) Driver() driver.Driver {
	return c.driver
}

func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

func (s *SQLiteStore) migrate(ctx context.Context) error {
	var version int
	if err := s.db.QueryRowContext(ctx, `PRAGMA user_version`).Scan(&version); err != nil {
		return err
	}
	if version > sqliteSchemaVersion {
		return fmt.Errorf("database schema version %d is newer than supported version %d", version, sqliteSchemaVersion)
	}

	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memo_id TEXT UNIQUE NOT NULL,
    encrypted_message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_time INTEGER,
    deletion_token_hash TEXT,
    owner_deletion_token_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_memos_memo_id ON memos(memo_id);
CREATE INDEX IF NOT EXISTS idx_memos_expiry_time ON memos(expiry_time);

CREATE TABLE IF NOT EXISTS app_stats (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS storage_usage (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    used_bytes INTEGER NOT NULL CHECK (used_bytes >= 0),
    used_memos INTEGER NOT NULL CHECK (used_memos >= 0),
    updated_at INTEGER NOT NULL
);
`)
	if err != nil {
		return err
	}
	if err := s.ensureColumn(ctx, "memos", "owner_deletion_token_hash", "TEXT"); err != nil {
		return err
	}
	if version < 2 {
		if err := s.removeLegacyRateLimits(ctx, version == 1); err != nil {
			return err
		}
	}
	if version < sqliteSchemaVersion {
		_, err = s.db.ExecContext(ctx, `PRAGMA user_version = `+strconv.Itoa(sqliteSchemaVersion))
	}
	return err
}

func (s *SQLiteStore) removeLegacyRateLimits(ctx context.Context, scrubHistoricalRows bool) error {
	var legacyTableCount int
	if err := s.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM sqlite_master
WHERE type = 'table' AND name = 'rate_limits'`).Scan(&legacyTableCount); err != nil {
		return fmt.Errorf("inspect legacy rate-limit table: %w", err)
	}
	if legacyTableCount == 0 && !scrubHistoricalRows {
		return nil
	}
	if err := s.ensureLegacyVacuumCapacity(ctx); err != nil {
		return err
	}

	var previousSecureDelete int
	if err := s.db.QueryRowContext(ctx, `PRAGMA secure_delete`).Scan(&previousSecureDelete); err != nil {
		return fmt.Errorf("read SQLite secure_delete mode: %w", err)
	}
	if _, err := s.db.ExecContext(ctx, `PRAGMA secure_delete = ON`); err != nil {
		return fmt.Errorf("enable SQLite secure deletion for legacy rate limits: %w", err)
	}

	_, dropErr := s.db.ExecContext(ctx, `DROP TABLE IF EXISTS rate_limits`)
	var vacuumErr error
	if dropErr == nil {
		if _, err := s.db.ExecContext(ctx, `VACUUM`); err != nil {
			vacuumErr = fmt.Errorf("vacuum legacy rate-limit remnants: %w", err)
		}
	}
	restoreErr := restoreSecureDeleteMode(ctx, s.db, previousSecureDelete)
	if dropErr != nil || vacuumErr != nil || restoreErr != nil {
		return errors.Join(dropErr, vacuumErr, restoreErr)
	}
	if err := s.checkpointWAL(ctx); err != nil {
		return fmt.Errorf("checkpoint scrubbed legacy rate limits: %w", err)
	}
	return nil
}

func (s *SQLiteStore) ensureLegacyVacuumCapacity(ctx context.Context) error {
	databaseBytes, err := fileSizeOrZero(s.path)
	if err != nil {
		return fmt.Errorf("read database size for legacy rate-limit scrub: %w", err)
	}
	pageSize, pageCount, _, err := sqlitePageStats(ctx, s.db)
	if err != nil {
		return fmt.Errorf("read logical database size for legacy rate-limit scrub: %w", err)
	}
	logicalBytes, err := checkedProduct(pageSize, pageCount)
	if err != nil {
		return fmt.Errorf("calculate logical database size for legacy rate-limit scrub: %w", err)
	}
	if logicalBytes > databaseBytes {
		databaseBytes = logicalBytes
	}
	available, err := s.availableDiskBytes(filepath.Dir(s.path))
	if err != nil {
		return fmt.Errorf("read filesystem capacity for legacy rate-limit scrub: %w", err)
	}
	if databaseBytes > (math.MaxInt64-s.limits.MinFreeDiskBytes)/2 {
		return fmt.Errorf("calculate free space for legacy rate-limit scrub: %w", ErrStorageLimitReached)
	}
	vacuumFreeBytes := databaseBytes * 2
	if available < vacuumFreeBytes+s.limits.MinFreeDiskBytes {
		return fmt.Errorf(
			"securely scrubbing the legacy rate-limit table needs at least %d bytes free in addition to the %d-byte filesystem reserve: %w",
			vacuumFreeBytes,
			s.limits.MinFreeDiskBytes,
			ErrStorageLimitReached,
		)
	}
	return nil
}

func restoreSecureDeleteMode(ctx context.Context, db *sql.DB, mode int) error {
	var statement string
	switch mode {
	case 0:
		statement = `PRAGMA secure_delete = OFF`
	case 1:
		statement = `PRAGMA secure_delete = ON`
	case 2:
		statement = `PRAGMA secure_delete = FAST`
	default:
		return fmt.Errorf("unsupported SQLite secure_delete mode %d", mode)
	}
	if _, err := db.ExecContext(ctx, statement); err != nil {
		return fmt.Errorf("restore SQLite secure_delete mode: %w", err)
	}
	return nil
}

func (s *SQLiteStore) reconcileStorageUsage(ctx context.Context) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := reconcileStorageUsageTx(ctx, tx); err != nil {
		return err
	}
	return tx.Commit()
}

func reconcileStorageUsageTx(ctx context.Context, tx *sql.Tx) error {
	var usedBytes int64
	var usedMemos int64
	if err := tx.QueryRowContext(ctx, `
SELECT COALESCE(SUM(length(CAST(encrypted_message AS BLOB))), 0), COUNT(*)
FROM memos`).Scan(&usedBytes, &usedMemos); err != nil {
		return err
	}
	_, err := tx.ExecContext(ctx, `
INSERT INTO storage_usage (singleton, used_bytes, used_memos, updated_at)
VALUES (1, ?, ?, ?)
ON CONFLICT(singleton) DO UPDATE SET
    used_bytes = excluded.used_bytes,
    used_memos = excluded.used_memos,
    updated_at = excluded.updated_at`, usedBytes, usedMemos, time.Now().Unix())
	return err
}

func (s *SQLiteStore) IncrementAppStat(ctx context.Context, key string) error {
	if !validAppStatKey(key) {
		return fmt.Errorf("unknown app stat key: %s", key)
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return normalizeStorageError(err)
	}
	defer tx.Rollback()
	if err := s.ensureFilesystemReserve(attackerWriteHeadroomBytes); err != nil {
		return err
	}
	now := time.Now().Unix()
	_, err = tx.ExecContext(ctx, `
INSERT INTO app_stats (key, value, updated_at)
VALUES (?, 1, ?)
ON CONFLICT(key) DO UPDATE SET
    value = value + 1,
    updated_at = excluded.updated_at`, key, now)
	if err != nil {
		return normalizeStorageError(err)
	}
	return normalizeStorageError(tx.Commit())
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

func (s *SQLiteStore) CreateMemo(ctx context.Context, memoID, encryptedMessage string, expiryTime int64, deletionTokenHash, ownerDeletionTokenHash string) error {
	incomingBytes := int64(len(encryptedMessage))
	if s.limits.MaxBytes > 0 && incomingBytes > s.limits.MaxBytes {
		return ErrStorageLimitReached
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return normalizeStorageError(err)
	}
	defer tx.Rollback()

	if err := s.ensureCreateCapacity(incomingBytes); err != nil {
		return err
	}
	reserved, err := s.reserveStorageUsage(ctx, tx, incomingBytes)
	if err != nil {
		return normalizeStorageError(err)
	}
	if !reserved {
		return ErrStorageLimitReached
	}

	_, err = tx.ExecContext(ctx, `
INSERT INTO memos (memo_id, encrypted_message, expiry_time, deletion_token_hash, owner_deletion_token_hash)
VALUES (?, ?, ?, ?, ?)`, memoID, encryptedMessage, expiryTime, deletionTokenHash, ownerDeletionTokenHash)
	if err != nil {
		return normalizeStorageError(err)
	}
	if err := tx.Commit(); err != nil {
		return normalizeStorageError(err)
	}
	return nil
}

func (s *SQLiteStore) ReadActiveMemo(ctx context.Context, memoID string) (Memo, error) {
	var memo Memo
	err := s.db.QueryRowContext(ctx, `
SELECT memo_id, encrypted_message, deletion_token_hash, owner_deletion_token_hash
FROM memos
WHERE memo_id = ?
AND (expiry_time IS NULL OR expiry_time > unixepoch('now'))`, memoID).Scan(
		&memo.ID,
		&memo.EncryptedMessage,
		&memo.DeletionTokenHash,
		&memo.OwnerDeletionTokenHash,
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
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var deletedBytes int64
	err = tx.QueryRowContext(ctx, `
SELECT length(CAST(encrypted_message AS BLOB))
FROM memos
WHERE memo_id = ?`, memoID).Scan(&deletedBytes)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	result, err := tx.ExecContext(ctx, `DELETE FROM memos WHERE memo_id = ?`, memoID)
	if err != nil {
		return false, err
	}
	changes, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	if changes != 1 {
		return false, fmt.Errorf("delete memo changed %d rows", changes)
	}
	if err := decrementStorageUsageTx(ctx, tx, deletedBytes, 1); err != nil {
		return false, err
	}
	if err := tx.Commit(); err != nil {
		return false, err
	}
	return true, nil
}

func (s *SQLiteStore) Cleanup(ctx context.Context) (CleanupResult, error) {
	var out CleanupResult
	cutoff := time.Now().Unix()
	if err := s.checkpointWAL(ctx); err != nil {
		return out, err
	}

	for {
		deleted, err := s.cleanupMemoBatch(ctx, cutoff)
		if err != nil {
			return out, err
		}
		out.MemosDeleted += deleted
		if deleted == 0 {
			break
		}
		if err := s.checkpointWAL(ctx); err != nil {
			return out, err
		}
	}

	return out, nil
}

func (s *SQLiteStore) cleanupMemoBatch(ctx context.Context, cutoff int64) (int64, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, `
DELETE FROM memos
WHERE id IN (
    SELECT id
    FROM memos
    WHERE expiry_time IS NOT NULL
      AND expiry_time < ?
    ORDER BY id
    LIMIT ?
)
RETURNING length(CAST(encrypted_message AS BLOB))`, cutoff, cleanupBatchSize)
	if err != nil {
		return 0, err
	}
	var deletedBytes int64
	var deletedMemos int64
	for rows.Next() {
		var memoBytes int64
		if err := rows.Scan(&memoBytes); err != nil {
			rows.Close()
			return 0, err
		}
		if memoBytes < 0 || deletedBytes > math.MaxInt64-memoBytes {
			rows.Close()
			return 0, errors.New("cleanup byte count overflow")
		}
		deletedBytes += memoBytes
		deletedMemos++
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, err
	}
	if err := rows.Close(); err != nil {
		return 0, err
	}
	if deletedMemos > 0 {
		if err := decrementStorageUsageTx(ctx, tx, deletedBytes, deletedMemos); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return deletedMemos, nil
}

func (s *SQLiteStore) checkpointWAL(ctx context.Context) error {
	var busy int
	var logFrames int
	var checkpointedFrames int
	if err := s.db.QueryRowContext(ctx, `PRAGMA wal_checkpoint(TRUNCATE)`).Scan(&busy, &logFrames, &checkpointedFrames); err != nil {
		return err
	}
	if busy != 0 {
		return fmt.Errorf("SQLite WAL checkpoint remained busy with %d log frames and %d checkpointed frames", logFrames, checkpointedFrames)
	}
	return nil
}

func (s *SQLiteStore) reserveStorageUsage(ctx context.Context, tx *sql.Tx, incomingBytes int64) (bool, error) {
	result, err := tx.ExecContext(ctx, `
UPDATE storage_usage
SET used_bytes = used_bytes + ?,
    used_memos = used_memos + 1,
    updated_at = ?
WHERE singleton = 1
  AND (? = 0 OR used_bytes <= ? - ?)
  AND (? = 0 OR used_memos < ?)`,
		incomingBytes,
		time.Now().Unix(),
		s.limits.MaxBytes,
		s.limits.MaxBytes,
		incomingBytes,
		s.limits.MaxMemos,
		s.limits.MaxMemos,
	)
	if err != nil {
		return false, err
	}
	changes, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	if changes == 1 {
		return true, nil
	}

	var exists int
	err = tx.QueryRowContext(ctx, `SELECT 1 FROM storage_usage WHERE singleton = 1`).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, errors.New("storage usage row is missing")
	}
	if err != nil {
		return false, err
	}
	return false, nil
}

func decrementStorageUsageTx(ctx context.Context, tx *sql.Tx, deletedBytes, deletedMemos int64) error {
	result, err := tx.ExecContext(ctx, `
UPDATE storage_usage
SET used_bytes = used_bytes - ?,
    used_memos = used_memos - ?,
    updated_at = ?
WHERE singleton = 1
  AND used_bytes >= ?
  AND used_memos >= ?`,
		deletedBytes,
		deletedMemos,
		time.Now().Unix(),
		deletedBytes,
		deletedMemos,
	)
	if err != nil {
		return err
	}
	changes, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if changes == 1 {
		return nil
	}
	return reconcileStorageUsageTx(ctx, tx)
}

func (s *SQLiteStore) ensureCreateCapacity(incomingBytes int64) error {
	if incomingBytes > math.MaxInt64-attackerWriteHeadroomBytes {
		return ErrStorageLimitReached
	}
	return s.ensureFilesystemReserve(incomingBytes + attackerWriteHeadroomBytes)
}

func (s *SQLiteStore) ensureFilesystemReserve(requiredBytes int64) error {
	if s.limits.MinFreeDiskBytes == 0 {
		return nil
	}
	available, err := s.availableDiskBytes(filepath.Dir(s.path))
	if err != nil {
		return fmt.Errorf("read database filesystem capacity: %w", err)
	}
	if available < s.limits.MinFreeDiskBytes || requiredBytes > available-s.limits.MinFreeDiskBytes {
		return ErrStorageLimitReached
	}
	return nil
}

func (s *SQLiteStore) StorageStats(ctx context.Context) (StorageStats, error) {
	stats := StorageStats{
		LimitBytes:       s.limits.MaxBytes,
		MemosLimit:       s.limits.MaxMemos,
		MinFreeDiskBytes: s.limits.MinFreeDiskBytes,
	}
	conn, err := s.db.Conn(ctx)
	if err != nil {
		return StorageStats{}, err
	}
	defer conn.Close()
	if err := conn.QueryRowContext(ctx, `
SELECT used_bytes, used_memos
FROM storage_usage
WHERE singleton = 1`).Scan(&stats.UsageBytes, &stats.Memos); err != nil {
		return StorageStats{}, err
	}
	pageSize, pageCount, freelistCount, err := sqlitePageStats(ctx, conn)
	if err != nil {
		return StorageStats{}, err
	}
	stats.SQLiteMainBytes, err = checkedProduct(pageSize, pageCount)
	if err != nil {
		return StorageStats{}, err
	}
	stats.SQLiteFreelistBytes, err = checkedProduct(pageSize, freelistCount)
	if err != nil {
		return StorageStats{}, err
	}
	stats.SQLiteWALBytes, err = fileSizeOrZero(s.path + "-wal")
	if err != nil {
		return StorageStats{}, err
	}
	stats.FilesystemAvailableBytes, err = s.availableDiskBytes(filepath.Dir(s.path))
	if err != nil {
		return StorageStats{}, err
	}
	return stats, nil
}

type queryRower interface {
	QueryRowContext(context.Context, string, ...interface{}) *sql.Row
}

func sqlitePageStats(ctx context.Context, queryer queryRower) (pageSize, pageCount, freelistCount int64, err error) {
	if err = queryer.QueryRowContext(ctx, `PRAGMA main.page_size`).Scan(&pageSize); err != nil {
		return 0, 0, 0, err
	}
	if err = queryer.QueryRowContext(ctx, `PRAGMA main.page_count`).Scan(&pageCount); err != nil {
		return 0, 0, 0, err
	}
	if err = queryer.QueryRowContext(ctx, `PRAGMA main.freelist_count`).Scan(&freelistCount); err != nil {
		return 0, 0, 0, err
	}
	return pageSize, pageCount, freelistCount, nil
}

func checkedProduct(left, right int64) (int64, error) {
	if left < 0 || right < 0 || (left != 0 && right > math.MaxInt64/left) {
		return 0, errors.New("storage size overflow")
	}
	return left * right, nil
}

func fileSizeOrZero(path string) (int64, error) {
	info, err := os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

func filesystemAvailableBytes(path string) (int64, error) {
	var stats syscall.Statfs_t
	if err := syscall.Statfs(path, &stats); err != nil {
		return 0, err
	}
	blockSize := uint64(stats.Bsize)
	availableBlocks := uint64(stats.Bavail)
	if blockSize == 0 {
		return 0, errors.New("filesystem reported a zero block size")
	}
	if availableBlocks > uint64(math.MaxInt64)/blockSize {
		return math.MaxInt64, nil
	}
	return int64(availableBlocks * blockSize), nil
}

func (limits StorageLimits) validate() error {
	if limits.MaxBytes < 0 {
		return errors.New("storage byte limit must not be negative")
	}
	if limits.MaxMemos < 0 {
		return errors.New("storage memo limit must not be negative")
	}
	if limits.MinFreeDiskBytes < 0 {
		return errors.New("minimum free disk bytes must not be negative")
	}
	return nil
}

func applyMaxPageCount(conn *sqlite3.SQLiteConn, limitBytes int64) error {
	pageSize, err := querySQLiteConnInt64(conn, `PRAGMA main.page_size`)
	if err != nil {
		return err
	}
	if pageSize <= 0 {
		return fmt.Errorf("invalid SQLite page size %d", pageSize)
	}

	requestedPages := maxSQLitePageCount
	if limitBytes > 0 {
		requestedPages = limitBytes / pageSize
		if requestedPages < 1 {
			requestedPages = 1
		}
		if requestedPages > maxSQLitePageCount {
			requestedPages = maxSQLitePageCount
		}
	}
	appliedPages, err := querySQLiteConnInt64(conn, `PRAGMA main.max_page_count = `+strconv.FormatInt(requestedPages, 10))
	if err != nil {
		return err
	}
	if appliedPages < requestedPages {
		return fmt.Errorf("SQLite applied max_page_count %d below requested %d", appliedPages, requestedPages)
	}
	return nil
}

func querySQLiteConnInt64(conn *sqlite3.SQLiteConn, query string) (int64, error) {
	rows, err := conn.Query(query, nil)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	values := make([]driver.Value, 1)
	if err := rows.Next(values); err != nil {
		if errors.Is(err, io.EOF) {
			return 0, errors.New("SQLite pragma returned no value")
		}
		return 0, err
	}
	value, ok := values[0].(int64)
	if !ok {
		return 0, fmt.Errorf("SQLite pragma returned %T, want int64", values[0])
	}
	return value, nil
}

func normalizeStorageError(err error) error {
	if err == nil {
		return nil
	}
	var sqliteErr sqlite3.Error
	if errors.As(err, &sqliteErr) && sqliteErr.Code == sqlite3.ErrFull {
		return fmt.Errorf("%w: %v", ErrStorageLimitReached, err)
	}
	return err
}

func (s *SQLiteStore) ensureColumn(ctx context.Context, tableName, columnName, columnType string) error {
	if tableName != "memos" || columnName != "owner_deletion_token_hash" || columnType != "TEXT" {
		return errors.New("unsupported migration column")
	}

	rows, err := s.db.QueryContext(ctx, `PRAGMA table_info(memos)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name string
		var typeName string
		var notNull int
		var defaultValue sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &typeName, &notNull, &defaultValue, &pk); err != nil {
			return err
		}
		if name == columnName {
			return rows.Err()
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, `ALTER TABLE memos ADD COLUMN owner_deletion_token_hash TEXT`)
	return err
}

package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/server"
	"github.com/timoheimonen/securememo/internal/store"
)

func main() {
	cfg, err := config.FromEnv()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := store.OpenSQLite(cfg.DBPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	app := server.New(cfg, db)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cleanupCtx, cleanupCancel := context.WithCancel(context.Background())
	defer cleanupCancel()
	go runCleanup(cleanupCtx, db, time.Hour)

	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           app,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("securememo listening on http://%s", cfg.Addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func runCleanup(ctx context.Context, db *store.SQLiteStore, interval time.Duration) {
	if result, err := db.Cleanup(ctx); err != nil {
		log.Printf("cleanup: %v", err)
	} else if result.MemosDeleted > 0 || result.RateLimitsDeleted > 0 {
		log.Printf("cleanup: deleted memos=%d rate_limits=%d", result.MemosDeleted, result.RateLimitsDeleted)
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if result, err := db.Cleanup(ctx); err != nil {
				log.Printf("cleanup: %v", err)
			} else if result.MemosDeleted > 0 || result.RateLimitsDeleted > 0 {
				log.Printf("cleanup: deleted memos=%d rate_limits=%d", result.MemosDeleted, result.RateLimitsDeleted)
			}
		}
	}
}

package memo

import (
	"errors"
	"sync"
	"time"

	"github.com/timoheimonen/securememo/internal/store"
)

const defaultRateLimitFallbackEntries = 65_536

type rateLimitFallback struct {
	mu              sync.Mutex
	entries         map[string]fallbackRateLimitEntry
	maxEntries      int
	now             func() time.Time
	nextSweep       time.Time
	capacityRetryAt time.Time
}

type fallbackRateLimitEntry struct {
	count     int
	expiresAt time.Time
}

func newRateLimitFallback(maxEntries int) *rateLimitFallback {
	return &rateLimitFallback{
		entries:    make(map[string]fallbackRateLimitEntry),
		maxEntries: maxEntries,
		now:        time.Now,
	}
}

func (l *rateLimitFallback) record(rules []store.RateLimitRule) (store.RateLimitResult, error) {
	for _, rule := range rules {
		if rule.Key == "" {
			return store.RateLimitResult{}, errors.New("key must not be empty")
		}
		if rule.Limit <= 0 {
			return store.RateLimitResult{}, errors.New("limit must be positive")
		}
		if rule.Window <= 0 {
			return store.RateLimitResult{}, errors.New("window must be positive")
		}
	}
	if len(rules) == 0 {
		return store.RateLimitResult{}, nil
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if l.nextSweep.IsZero() || !now.Before(l.nextSweep) {
		l.sweepExpired(now)
		l.nextSweep = now.Add(time.Minute)
	}

	missing := l.missingEntries(rules, now)
	if len(l.entries)+missing > l.maxEntries {
		if !l.capacityRetryAt.IsZero() && now.Before(l.capacityRetryAt) {
			return store.RateLimitResult{
				Limited:    true,
				Remaining:  0,
				RetryAfter: l.capacityRetryAt.Sub(now),
			}, nil
		}
		l.sweepExpired(now)
		missing = l.missingEntries(rules, now)
		if len(l.entries)+missing > l.maxEntries {
			retryAfter := l.capacityRetry(now)
			l.capacityRetryAt = now.Add(retryAfter)
			return store.RateLimitResult{Limited: true, Remaining: 0, RetryAfter: retryAfter}, nil
		}
	}

	result := store.RateLimitResult{}
	for _, rule := range rules {
		entry, exists := l.entries[rule.Key]
		if !exists || !now.Before(entry.expiresAt) {
			l.entries[rule.Key] = fallbackRateLimitEntry{
				count:     1,
				expiresAt: now.Add(rule.Window),
			}
			continue
		}
		if entry.count >= rule.Limit {
			result.Limited = true
			retryAfter := entry.expiresAt.Sub(now)
			if retryAfter > result.RetryAfter {
				result.RetryAfter = retryAfter
			}
			continue
		}
		entry.count++
		l.entries[rule.Key] = entry
	}
	return result, nil
}

func (l *rateLimitFallback) missingEntries(rules []store.RateLimitRule, now time.Time) int {
	missing := make(map[string]struct{}, len(rules))
	for _, rule := range rules {
		entry, exists := l.entries[rule.Key]
		if !exists || !now.Before(entry.expiresAt) {
			missing[rule.Key] = struct{}{}
		}
	}
	return len(missing)
}

func (l *rateLimitFallback) sweepExpired(now time.Time) {
	for key, entry := range l.entries {
		if !now.Before(entry.expiresAt) {
			delete(l.entries, key)
		}
	}
	if len(l.entries) < l.maxEntries {
		l.capacityRetryAt = time.Time{}
	}
}

func (l *rateLimitFallback) capacityRetry(now time.Time) time.Duration {
	var earliest time.Time
	for _, entry := range l.entries {
		if earliest.IsZero() || entry.expiresAt.Before(earliest) {
			earliest = entry.expiresAt
		}
	}
	if earliest.IsZero() || !earliest.After(now) {
		return time.Second
	}
	return earliest.Sub(now)
}

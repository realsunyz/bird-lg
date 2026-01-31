package main

import (
	"sync"
	"time"
)

var (
	rateLimitInterval time.Duration = time.Second
	lastRequestTime   time.Time
	rateLimitMu       sync.Mutex
)

func setRateLimitInterval(interval time.Duration) {
	rateLimitMu.Lock()
	defer rateLimitMu.Unlock()
	rateLimitInterval = interval
}

func checkRateLimit() bool {
	rateLimitMu.Lock()
	defer rateLimitMu.Unlock()

	now := time.Now()
	if now.Sub(lastRequestTime) < rateLimitInterval {
		return false
	}
	lastRequestTime = now
	return true
}

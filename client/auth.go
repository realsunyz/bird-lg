package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

var sharedSecret string

func setSharedSecret(secret string) {
	sharedSecret = secret
}

// Verify the HMAC-SHA256 signature of a request
// Format: base64(hmac-sha256(timestamp + ":" + body))
// Headers: X-Signature, X-Timestamp
func verifySignature(r *http.Request) error {
	if sharedSecret == "" {
		return nil // Disable verification if no secret configured
	}

	signature := r.Header.Get("X-Signature")
	timestampStr := r.Header.Get("X-Timestamp")

	if signature == "" || timestampStr == "" {
		return fmt.Errorf("missing signature headers")
	}

	// Check timestamp (allow 5 minute window)
	timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid timestamp")
	}

	now := time.Now().Unix()
	if now-timestamp > 300 || timestamp-now > 60 {
		return fmt.Errorf("timestamp expired or too far in future")
	}

	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return fmt.Errorf("failed to read body: %w", err)
	}

	// Compute expected signature
	message := fmt.Sprintf("%s:%s", timestampStr, string(body))
	mac := hmac.New(sha256.New, []byte(sharedSecret))
	mac.Write([]byte(message))
	expectedSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// Verify signature
	if signature != expectedSig {
		return fmt.Errorf("signature verification failed")
	}

	// Put body back for handler
	r.Body = io.NopCloser(strings.NewReader(string(body)))

	return nil
}

// Wrap a handler with HMAC signature verification
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := verifySignature(r); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// Add CORS headers
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowedOrigins == "*" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			for _, allowed := range strings.Split(allowedOrigins, ",") {
				if strings.TrimSpace(allowed) == origin {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					break
				}
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Signature, X-Timestamp")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

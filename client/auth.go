package main

import (
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

var publicKey *ecdsa.PublicKey

// loadPublicKey loads an ECDSA public key from a PEM file
func loadPublicKey(filename string) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("failed to read public key file: %w", err)
	}

	block, _ := pem.Decode(data)
	if block == nil {
		return fmt.Errorf("failed to parse PEM block")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return fmt.Errorf("failed to parse public key: %w", err)
	}

	var ok bool
	publicKey, ok = pub.(*ecdsa.PublicKey)
	if !ok {
		return fmt.Errorf("not an ECDSA public key")
	}

	return nil
}

// verifySignature verifies the ECDSA signature of a request
// Signature format: base64(sign(sha256(timestamp + ":" + body)))
// Headers required: X-Signature, X-Timestamp
func verifySignature(r *http.Request) error {
	if publicKey == nil {
		return nil // No verification if no public key configured
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

	// Compute hash
	message := fmt.Sprintf("%s:%s", timestampStr, string(body))
	hash := sha256.Sum256([]byte(message))

	// Decode signature
	sigBytes, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return fmt.Errorf("invalid signature encoding")
	}

	// Verify
	if !ecdsa.VerifyASN1(publicKey, hash[:], sigBytes) {
		return fmt.Errorf("signature verification failed")
	}

	// Put body back for handler
	r.Body = io.NopCloser(strings.NewReader(string(body)))

	return nil
}

// authMiddleware wraps a handler with ECDSA signature verification
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := verifySignature(r); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// corsMiddleware adds CORS headers
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

package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"
)

// Auth types
const (
	AuthTypeTurnstile = "captcha"
	AuthTypeLogto     = "sso"
)

// Expiry durations
const (
	ExpiryTurnstile = 5 * time.Minute    // 5 minutes
	ExpiryLogto     = 7 * 24 * time.Hour // 7 days
)

type JWTHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

type JWTPayload struct {
	Exp      int64  `json:"exp"`
	Iat      int64  `json:"iat"`
	AuthType string `json:"auth_type,omitempty"`
	Sub      string `json:"sub,omitempty"` // User ID for Logto users
}

func GenerateJWT(secret string) string {
	return GenerateJWTWithType(secret, AuthTypeTurnstile, "")
}

func GenerateJWTWithType(secret, authType, sub string) string {
	header := JWTHeader{Alg: "HS256", Typ: "JWT"}
	headerBytes, _ := json.Marshal(header)
	headerB64 := base64.RawURLEncoding.EncodeToString(headerBytes)

	var expiry time.Duration
	switch authType {
	case AuthTypeLogto:
		expiry = ExpiryLogto
	default:
		expiry = ExpiryTurnstile
		authType = AuthTypeTurnstile
	}

	now := time.Now()
	payload := JWTPayload{
		Iat:      now.Unix(),
		Exp:      now.Add(expiry).Unix(),
		AuthType: authType,
		Sub:      sub,
	}
	payloadBytes, _ := json.Marshal(payload)
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadBytes)

	message := headerB64 + "." + payloadB64
	signature := signHS256(message, secret)

	return message + "." + signature
}

func GenerateJWTWithSub(secret, authType, sub string) string {
	return GenerateJWTWithType(secret, authType, sub)
}

func ValidateJWT(token, secret string) bool {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return false
	}

	message := parts[0] + "." + parts[1]
	expectedSig := signHS256(message, secret)
	if parts[2] != expectedSig {
		return false
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return false
	}

	var payload JWTPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return false
	}

	// Check expiry
	if time.Now().Unix() > payload.Exp {
		return false
	}

	return true
}

func GetValidJWTPayload(token, secret string) *JWTPayload {
	if !ValidateJWT(token, secret) {
		return nil
	}
	parts := strings.Split(token, ".")
	payloadBytes, _ := base64.RawURLEncoding.DecodeString(parts[1])
	var payload JWTPayload
	json.Unmarshal(payloadBytes, &payload)
	return &payload
}

func signHS256(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}

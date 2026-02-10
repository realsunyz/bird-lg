package main

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
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
	claims := jwt.MapClaims{
		"iat":       payload.Iat,
		"exp":       payload.Exp,
		"auth_type": payload.AuthType,
	}
	if payload.Sub != "" {
		claims["sub"] = payload.Sub
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		return ""
	}
	return signedToken
}

func GenerateJWTWithSub(secret, authType, sub string) string {
	return GenerateJWTWithType(secret, authType, sub)
}

func GetValidJWTPayload(token, secret string) *JWTPayload {
	claims, err := parseJWTClaims(token, secret)
	if err != nil {
		return nil
	}

	exp, ok := claimInt64(claims, "exp")
	if !ok {
		return nil
	}
	iat, ok := claimInt64(claims, "iat")
	if !ok {
		return nil
	}

	return &JWTPayload{
		Exp:      exp,
		Iat:      iat,
		AuthType: claimString(claims, "auth_type"),
		Sub:      claimString(claims, "sub"),
	}
}

func parseJWTClaims(token, secret string) (jwt.MapClaims, error) {
	parsedToken, err := jwt.Parse(token, func(t *jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired(), jwt.WithIssuedAt())
	if err != nil {
		return nil, err
	}
	if !parsedToken.Valid {
		return nil, errors.New("invalid token")
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}
	return claims, nil
}

func claimString(claims jwt.MapClaims, key string) string {
	raw, ok := claims[key]
	if !ok {
		return ""
	}
	val, ok := raw.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(val)
}

func claimInt64(claims jwt.MapClaims, key string) (int64, bool) {
	raw, ok := claims[key]
	if !ok {
		return 0, false
	}

	switch v := raw.(type) {
	case float64:
		return int64(v), true
	case float32:
		return int64(v), true
	case int64:
		return v, true
	case int32:
		return int64(v), true
	case int:
		return int64(v), true
	case string:
		parsed, err := strconv.ParseInt(strings.TrimSpace(v), 10, 64)
		if err == nil {
			return parsed, true
		}
	}

	return 0, false
}

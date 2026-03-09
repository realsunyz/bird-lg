package auth

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	AuthTypeTurnstile = "captcha"
	AuthTypeLogto     = "sso"
)

const (
	ExpiryTurnstile = 5 * time.Minute
	ExpiryLogto     = 7 * 24 * time.Hour
)

type Payload struct {
	Exp      int64  `json:"exp"`
	Iat      int64  `json:"iat"`
	AuthType string `json:"auth_type,omitempty"`
	Sub      string `json:"sub,omitempty"`
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
	claims := jwt.MapClaims{
		"iat":       now.Unix(),
		"exp":       now.Add(expiry).Unix(),
		"auth_type": authType,
	}
	if sub != "" {
		claims["sub"] = sub
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

func GetValidJWTPayload(token, secret string) *Payload {
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

	return &Payload{Exp: exp, Iat: iat, AuthType: ClaimString(claims, "auth_type"), Sub: ClaimString(claims, "sub")}
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

func ClaimString(claims jwt.MapClaims, key string) string {
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

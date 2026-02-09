package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"time"

	jlexer "github.com/mailru/easyjson/jlexer"
	jwriter "github.com/mailru/easyjson/jwriter"
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

func marshalJWTHeader(header JWTHeader) ([]byte, error) {
	var w jwriter.Writer
	w.RawByte('{')
	w.RawString("\"alg\":")
	w.String(header.Alg)
	w.RawByte(',')
	w.RawString("\"typ\":")
	w.String(header.Typ)
	w.RawByte('}')
	return w.Buffer.BuildBytes(), w.Error
}

func marshalJWTPayload(payload JWTPayload) ([]byte, error) {
	var w jwriter.Writer
	w.RawByte('{')

	w.RawString("\"exp\":")
	w.Int64(payload.Exp)
	w.RawByte(',')
	w.RawString("\"iat\":")
	w.Int64(payload.Iat)

	if payload.AuthType != "" {
		w.RawByte(',')
		w.RawString("\"auth_type\":")
		w.String(payload.AuthType)
	}
	if payload.Sub != "" {
		w.RawByte(',')
		w.RawString("\"sub\":")
		w.String(payload.Sub)
	}

	w.RawByte('}')
	return w.Buffer.BuildBytes(), w.Error
}

func unmarshalJWTPayload(data []byte) (*JWTPayload, error) {
	in := jlexer.Lexer{Data: data}
	out := &JWTPayload{}

	if in.IsNull() {
		in.Skip()
		in.Consumed()
		return out, in.Error()
	}

	in.Delim('{')
	for !in.IsDelim('}') {
		key := in.UnsafeFieldName(false)
		in.WantColon()
		switch key {
		case "exp":
			if in.IsNull() {
				in.Skip()
			} else {
				out.Exp = in.Int64()
			}
		case "iat":
			if in.IsNull() {
				in.Skip()
			} else {
				out.Iat = in.Int64()
			}
		case "auth_type":
			if in.IsNull() {
				in.Skip()
			} else {
				out.AuthType = string(in.String())
			}
		case "sub":
			if in.IsNull() {
				in.Skip()
			} else {
				out.Sub = string(in.String())
			}
		default:
			in.SkipRecursive()
		}
		in.WantComma()
	}
	in.Delim('}')
	in.Consumed()
	return out, in.Error()
}

func GenerateJWT(secret string) string {
	return GenerateJWTWithType(secret, AuthTypeTurnstile, "")
}

func GenerateJWTWithType(secret, authType, sub string) string {
	header := JWTHeader{Alg: "HS256", Typ: "JWT"}
	headerBytes, _ := marshalJWTHeader(header)
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
	payloadBytes, _ := marshalJWTPayload(payload)
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

	payload, err := unmarshalJWTPayload(payloadBytes)
	if err != nil {
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
	payload, err := unmarshalJWTPayload(payloadBytes)
	if err != nil {
		return nil
	}
	return payload
}

func signHS256(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}

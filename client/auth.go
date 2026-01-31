package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
)

var sharedSecret string

func setSharedSecret(secret string) {
	sharedSecret = secret
}

func verifySignature(c fiber.Ctx) error {
	if sharedSecret == "" {
		return nil
	}

	signature := c.Get("X-Signature")
	timestampStr := c.Get("X-Timestamp")

	if signature == "" || timestampStr == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "missing_signature")
	}

	timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid_timestamp")
	}

	now := time.Now().Unix()
	if now-timestamp > 300 || timestamp-now > 60 {
		return fiber.NewError(fiber.StatusUnauthorized, "timestamp_expired")
	}

	body := c.Body()

	message := timestampStr + ":" + string(body)
	mac := hmac.New(sha256.New, []byte(sharedSecret))
	mac.Write([]byte(message))
	expectedSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	if signature != expectedSig {
		return fiber.NewError(fiber.StatusUnauthorized, "signature_invalid")
	}

	return nil
}

func authMiddleware(handler fiber.Handler) fiber.Handler {
	return func(c fiber.Ctx) error {
		if err := verifySignature(c); err != nil {
			if fiberErr, ok := err.(*fiber.Error); ok {
				return c.Status(fiberErr.Code).JSON(fiber.Map{"error": fiberErr.Message})
			}
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "auth_failed"})
		}
		return handler(c)
	}
}

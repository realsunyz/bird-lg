package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strconv"
	"strings"
	"time"

	"bird-lg-client/internal/platform"
	"github.com/gofiber/fiber/v3"
)

type Auth struct {
	sharedSecret string
}

func NewAuth(sharedSecret string) *Auth {
	return &Auth{sharedSecret: sharedSecret}
}

func (a *Auth) Verify(c fiber.Ctx) error {
	if a.sharedSecret == "" {
		return nil
	}

	signature := c.Get("X-Signature")
	timestampStr := c.Get("X-Timestamp")
	if signature == "" || timestampStr == "" {
		return fiber.NewError(fiber.StatusUnauthorized, platform.FormatPublicError(platform.ErrCodeAuthMissingSignature, "Missing signature headers"))
	}

	timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, platform.FormatPublicError(platform.ErrCodeAuthInvalidTimestamp, "Invalid timestamp"))
	}

	now := time.Now().Unix()
	if now-timestamp > 300 || timestamp-now > 60 {
		return fiber.NewError(fiber.StatusUnauthorized, platform.FormatPublicError(platform.ErrCodeAuthTimestampExpired, "Timestamp expired"))
	}

	message := timestampStr + ":" + strings.ToUpper(c.Method()) + ":" + string(c.RequestCtx().RequestURI()) + ":" + string(c.Body())
	mac := hmac.New(sha256.New, []byte(a.sharedSecret))
	mac.Write([]byte(message))
	expectedSig := mac.Sum(nil)
	givenSig, decodeErr := base64.StdEncoding.DecodeString(signature)
	if decodeErr != nil || !hmac.Equal(givenSig, expectedSig) {
		return fiber.NewError(fiber.StatusUnauthorized, platform.FormatPublicError(platform.ErrCodeAuthSignatureInvalid, "Invalid signature"))
	}

	return nil
}

func (a *Auth) Wrap(handler fiber.Handler) fiber.Handler {
	return func(c fiber.Ctx) error {
		if err := a.Verify(c); err != nil {
			if fiberErr, ok := err.(*fiber.Error); ok {
				return c.Status(fiberErr.Code).JSON(fiber.Map{"error": fiberErr.Message})
			}
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": platform.FormatPublicError(platform.ErrCodeAuthFailed, "Authentication failed")})
		}
		return handler(c)
	}
}

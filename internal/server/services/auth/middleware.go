package auth

import (
	"bird-lg/server/internal/server/platform/config"
	errx "bird-lg/server/internal/server/platform/errors"

	jwtware "github.com/gofiber/contrib/v3/jwt"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/extractors"
)

func ToolJWTMiddleware(cfg *config.Config) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(cfg.JWTSecret)},
		Extractor:  extractors.FromCookie(cfg.CookieName()),
		Next: func(_ fiber.Ctx) bool {
			return cfg.TurnstileSecretKey == ""
		},
		ErrorHandler: func(c fiber.Ctx, _ error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": errx.FormatPublicError(errx.ErrCodeAuthUnauthorized, "Authentication required"),
			})
		},
	})
}

func SSOJWTMiddleware(cfg *config.Config) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(cfg.JWTSecret)},
		Extractor:  extractors.FromCookie(cfg.CookieName()),
		ErrorHandler: func(c fiber.Ctx, _ error) error {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": errx.FormatPublicError(errx.ErrCodeAuthSSORequired, "SSO authentication required"),
			})
		},
	})
}

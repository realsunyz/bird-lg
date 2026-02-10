package main

import (
	jwtware "github.com/gofiber/contrib/v3/jwt"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/extractors"
)

func toolJWTMiddleware(config *Config) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{
			Key: []byte(config.JWTSecret),
		},
		Extractor: extractors.FromCookie(config.CookieName()),
		Next: func(_ fiber.Ctx) bool {
			return config.TurnstileSecretKey == ""
		},
		ErrorHandler: func(c fiber.Ctx, _ error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": formatPublicError(errCodeAuthUnauthorized, "Authentication required"),
			})
		},
	})
}

func ssoJWTMiddleware(config *Config) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{
			Key: []byte(config.JWTSecret),
		},
		Extractor: extractors.FromCookie(config.CookieName()),
		ErrorHandler: func(c fiber.Ctx, _ error) error {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": formatPublicError(errCodeAuthSSORequired, "SSO authentication required"),
			})
		},
	})
}

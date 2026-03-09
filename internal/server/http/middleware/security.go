package middleware

import (
	"bird-lg/server/internal/server/platform/config"
	"bird-lg/server/internal/server/services/auth"
	"github.com/gofiber/fiber/v3"
)

func ToolJWT(cfg *config.Config) fiber.Handler {
	return auth.ToolJWTMiddleware(cfg)
}

func SSOJWT(cfg *config.Config) fiber.Handler {
	return auth.SSOJWTMiddleware(cfg)
}

package api

import (
	"time"

	"bird-lg/server/internal/auth"
	"bird-lg/server/internal/config"
	errx "bird-lg/server/internal/errors"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/csrf"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/limiter"
)

func Register(app *fiber.App, cfg *config.Config) {
	api := app.Group("/api")
	api.Use(limiter.New(limiter.Config{
		Max:        120,
		Expiration: time.Minute,
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": errx.FormatPublicError("ERR-RATE-429", "Rate limit exceeded")})
		},
	}))
	api.Use(csrf.New(csrf.Config{
		CookieSecure: cfg.HTTPS,
		CookieName:   "csrf_",
		Next: func(c fiber.Ctx) bool {
			return c.Method() == fiber.MethodGet && c.Path() == "/api/config"
		},
		ErrorHandler: func(c fiber.Ctx, _ error) error {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": errx.FormatPublicError("ERR-REQ-403-CSRF", "CSRF token validation failed")})
		},
	}))

	toolAuth := auth.ToolJWTMiddleware(cfg)
	ssoAuth := auth.SSOJWTMiddleware(cfg)

	api.Get("/config", WithTimeout(HandleConfig(cfg), 5*time.Second))
	api.Get("/auth", WithTimeout(HandleAuth(cfg), 5*time.Second))
	api.Get("/health", healthcheck.New())
	api.Post("/verify", WithTimeout(HandleVerify(cfg), 10*time.Second))
	api.Post("/bird", ssoAuth, WithTimeout(HandleBird(cfg), 35*time.Second))
	api.Post("/tool/ping", toolAuth, WithTimeout(HandleToolPing(cfg), 35*time.Second))
	api.Post("/tool/ping/stream", toolAuth, HandleToolPingStream(cfg))
	api.Post("/tool/traceroute", toolAuth, WithTimeout(HandleToolTraceroute(cfg), 70*time.Second))
	api.Post("/tool/traceroute/stream", toolAuth, HandleToolTracerouteStream(cfg))

	api.Get("/auth/login", WithTimeout(HandleLogtoLogin(cfg), 10*time.Second))
	api.Get("/auth/logout", WithTimeout(HandleLogtoLogout(cfg), 5*time.Second))
	app.Get("/auth/callback", WithTimeout(HandleLogtoCallback(cfg), 20*time.Second))
}

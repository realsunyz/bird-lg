package router

import (
	"time"

	"bird-lg/server/internal/server/http/handlers"
	httpmiddleware "bird-lg/server/internal/server/http/middleware"
	"bird-lg/server/internal/server/platform/config"
	errx "bird-lg/server/internal/server/platform/errors"
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

	toolAuth := httpmiddleware.ToolJWT(cfg)
	ssoAuth := httpmiddleware.SSOJWT(cfg)

	api.Get("/config", httpmiddleware.WithTimeout(handlers.HandleConfig(cfg), 5*time.Second))
	api.Get("/auth", httpmiddleware.WithTimeout(handlers.HandleAuth(cfg), 5*time.Second))
	api.Get("/health", healthcheck.New())
	api.Post("/verify", httpmiddleware.WithTimeout(handlers.HandleVerify(cfg), 10*time.Second))
	api.Post("/bird", ssoAuth, httpmiddleware.WithTimeout(handlers.HandleBird(cfg), 35*time.Second))
	api.Post("/tool/ping", toolAuth, httpmiddleware.WithTimeout(handlers.HandleToolPing(cfg), 35*time.Second))
	api.Post("/tool/ping/stream", toolAuth, handlers.HandleToolPingStream(cfg))
	api.Post("/tool/traceroute", toolAuth, httpmiddleware.WithTimeout(handlers.HandleToolTraceroute(cfg), 70*time.Second))
	api.Post("/tool/traceroute/stream", toolAuth, handlers.HandleToolTracerouteStream(cfg))

	api.Get("/auth/login", httpmiddleware.WithTimeout(handlers.HandleLogtoLogin(cfg), 10*time.Second))
	app.Get("/auth/logout", httpmiddleware.WithTimeout(handlers.HandleLogtoLogout(cfg), 5*time.Second))
	app.Get("/auth/callback", httpmiddleware.WithTimeout(handlers.HandleLogtoCallback(cfg), 20*time.Second))
}

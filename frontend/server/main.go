package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/csrf"
	"github.com/gofiber/fiber/v3/middleware/etag"
	"github.com/gofiber/fiber/v3/middleware/favicon"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/logger"
	recovermw "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/gofiber/fiber/v3/middleware/timeout"
)

func main() {
	config := LoadConfig()
	staticDir := config.StaticDir
	indexFile := filepath.Join(staticDir, "index.html")

	if !fiber.IsChild() {
		log.Printf("Loaded config: %d servers, static_dir=%s", len(config.Servers), staticDir)
	}

	app := fiber.New(fiber.Config{
		CaseSensitive: true,
		StrictRouting: false,
		ServerHeader:  "bird-lg",
		JSONEncoder:   jsonMarshal,
		JSONDecoder:   jsonUnmarshal,
	})

	// Middleware
	app.Use(recovermw.New())
	app.Use(logger.New())
	app.Use(helmet.New(helmet.Config{
		HSTSMaxAge:         31536000,
		HSTSPreloadEnabled: false,
	}))
	app.Use(favicon.New(serverFaviconConfig(staticDir)))
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
		Next: func(c fiber.Ctx) bool {
			return isStreamPath(c.Path())
		},
	}))
	app.Use(etag.New(etag.Config{
		Next: func(c fiber.Ctx) bool {
			return isStreamPath(c.Path())
		},
	}))

	// API routes
	api := app.Group("/api")
	api.Use(limiter.New(limiter.Config{
		Max:        120,
		Expiration: time.Minute,
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": formatPublicError("ERR-RATE-429", "Rate limit exceeded"),
			})
		},
	}))
	api.Use(csrf.New(csrf.Config{
		CookieSecure: config.HTTPS,
		CookieName:   "csrf_",
		ErrorHandler: func(c fiber.Ctx, _ error) error {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": formatPublicError("ERR-REQ-403-CSRF", "CSRF token validation failed"),
			})
		},
	}))
	toolAuth := toolJWTMiddleware(config)
	ssoAuth := ssoJWTMiddleware(config)
	api.Get("/config", withTimeout(handleConfig(config), 5*time.Second))
	api.Get("/health", healthcheck.New())
	api.Post("/verify", withTimeout(handleVerify(config), 10*time.Second))
	api.Post("/bird", ssoAuth, withTimeout(handleBird(config), 35*time.Second))
	api.Post("/tool/ping", toolAuth, withTimeout(handleToolPing(config), 35*time.Second))
	api.Post("/tool/ping/stream", toolAuth, handleToolPingStream(config))
	api.Post("/tool/traceroute", toolAuth, withTimeout(handleToolTraceroute(config), 70*time.Second))
	api.Post("/tool/traceroute/stream", toolAuth, handleToolTracerouteStream(config))

	// Auth routes
	api.Get("/auth/login", withTimeout(handleLogtoLogin(config), 10*time.Second))
	api.Get("/auth/logout", withTimeout(handleLogtoLogout(config), 5*time.Second))
	app.Get("/auth/callback", withTimeout(handleLogtoCallback(config), 20*time.Second))

	// SPA routes
	app.Get("/", func(c fiber.Ctx) error {
		return c.SendFile(indexFile)
	})
	app.Get("/detail/:serverId", func(c fiber.Ctx) error {
		return c.SendFile(indexFile)
	})

	// Static assets
	app.Use(static.New(staticDir))

	// SPA fallback 404 page
	app.Get("*", func(c fiber.Ctx) error {
		if strings.HasPrefix(c.Path(), "/api/") || strings.HasPrefix(c.Path(), "/auth/") {
			return c.SendStatus(fiber.StatusNotFound)
		}
		if filepath.Ext(c.Path()) != "" {
			return c.SendStatus(fiber.StatusNotFound)
		}
		return c.Status(fiber.StatusNotFound).SendFile(indexFile)
	})

	// Fallback 404 for all other methods/routes
	app.Use(func(c fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNotFound)
	})

	if !fiber.IsChild() {
		log.Printf("Starting server on %s (prefork: %v)", config.ListenAddr, true)
	}
	if err := app.Listen(config.ListenAddr, fiber.ListenConfig{
		EnablePrefork: false,
	}); err != nil {
		log.Fatal(err)
	}
}

func withTimeout(handler fiber.Handler, d time.Duration) fiber.Handler {
	return timeout.New(handler, timeout.Config{
		Timeout: d,
		OnTimeout: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusRequestTimeout).JSON(fiber.Map{
				"error": formatPublicError("ERR-REQ-408", "Request timeout"),
			})
		},
	})
}

func isStreamPath(p string) bool {
	return strings.HasSuffix(p, "/stream")
}

func serverFaviconConfig(staticDir string) favicon.Config {
	faviconPath := filepath.Join(staticDir, "favicon.ico")
	if info, err := os.Stat(faviconPath); err == nil && !info.IsDir() {
		return favicon.Config{File: faviconPath}
	}
	return favicon.Config{}
}

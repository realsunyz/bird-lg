package main

import (
	"log"
	"strings"
	"time"

	"bird-lg/client/internal/http/handlers"
	"bird-lg/client/internal/http/middleware"
	"bird-lg/client/internal/model"
	"bird-lg/client/internal/platform"
	"bird-lg/client/internal/runner"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/etag"
	"github.com/gofiber/fiber/v3/middleware/favicon"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	recovermw "github.com/gofiber/fiber/v3/middleware/recover"
)

func main() {
	cfg := platform.ParseConfig()

	if cfg.RateLimitMS > 0 {
		log.Printf("[INFO] Rate limit: %dms", cfg.RateLimitMS)
	} else {
		log.Printf("[INFO] Rate limit: disabled")
	}

	if cfg.HMACSecret != "" {
		log.Printf("[INFO] HMAC verification: enabled")
	} else {
		log.Printf("[WARN] HMAC verification: disabled")
	}

	app := fiber.New(fiber.Config{
		JSONEncoder: platform.JSONMarshal,
		JSONDecoder: platform.JSONUnmarshal,
	})

	app.Use(recovermw.New())
	app.Use(helmet.New())
	app.Use(favicon.New())
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
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Split(cfg.AllowedOrigins, ","),
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "X-Signature", "X-Timestamp"},
		AllowCredentials: false,
	}))

	if cfg.RateLimitMS > 0 {
		app.Use("/api/tool", limiter.New(limiter.Config{
			Max:        1,
			Expiration: time.Duration(cfg.RateLimitMS) * time.Millisecond,
			KeyGenerator: func(_ fiber.Ctx) string {
				return "global"
			},
			LimitReached: func(c fiber.Ctx) error {
				return c.Status(fiber.StatusTooManyRequests).JSON(model.WithBuildInfo(model.ApiGenericResponse{
					Error:     platform.PublicErrorFromKey("rate_limit_exceeded"),
					RateLimit: true,
				}))
			},
		}))
	}

	auth := middleware.NewAuth(cfg.HMACSecret)
	h := handlers.New(runner.SystemRunner{}, cfg.BirdSocket)

	app.Post("/api/tool/ping", auth.Wrap(middleware.WithTimeout(h.Ping, handlers.PingTimeout)))
	app.Post("/api/tool/ping/stream", auth.Wrap(h.PingStream))
	app.Post("/api/tool/traceroute", auth.Wrap(middleware.WithTimeout(h.Traceroute, handlers.TracerouteTimeout)))
	app.Post("/api/tool/traceroute/stream", auth.Wrap(h.TracerouteStream))
	app.Post("/api/tool/bird", auth.Wrap(middleware.WithTimeout(h.Bird, handlers.BirdTimeout)))
	app.Post("/api/version", auth.Wrap(h.Version))
	app.Get("/api/health", healthcheck.New())

	log.Printf("[INFO] Starting on %s", cfg.ListenAddr)
	log.Printf("[INFO] BIRD socket: %s", cfg.BirdSocket)

	if err := app.Listen(cfg.ListenAddr); err != nil {
		log.Fatalf("[ERROR] Server failed: %v", err)
	}
}

func isStreamPath(p string) bool {
	return strings.HasSuffix(p, "/stream")
}

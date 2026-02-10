package main

import (
	"flag"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/etag"
	"github.com/gofiber/fiber/v3/middleware/favicon"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	recovermw "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/timeout"
)

var (
	listenAddr     string
	birdSocket     string
	hmacSecret     string
	allowedOrigins string
	rateLimitMs    int
)

func init() {
	flag.StringVar(&listenAddr, "listen", ":8000", "Listen address")
	flag.StringVar(&birdSocket, "bird", "/run/bird/bird.ctl", "BIRD socket path")
	flag.StringVar(&hmacSecret, "secret", "", "HMAC shared secret for signature verification")
	flag.StringVar(&allowedOrigins, "origins", "*", "Allowed CORS origins (comma-separated)")
	flag.IntVar(&rateLimitMs, "ratelimit", 1000, "Rate limit interval in milliseconds (0 to disable)")
}

func main() {
	flag.Parse()

	if rateLimitMs > 0 {
		log.Printf("[INFO] Rate limit: %dms", rateLimitMs)
	} else {
		log.Printf("[INFO] Rate limit: disabled")
	}

	if hmacSecret != "" {
		setSharedSecret(hmacSecret)
		log.Printf("[INFO] HMAC verification: enabled")
	} else {
		log.Printf("[WARN] HMAC verification: disabled")
	}

	app := fiber.New(fiber.Config{
		JSONEncoder: jsonMarshal,
		JSONDecoder: jsonUnmarshal,
	})

	app.Use(recovermw.New())
	app.Use(helmet.New())
	app.Use(favicon.New())
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))
	app.Use(etag.New())

	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Split(allowedOrigins, ","),
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "X-Signature", "X-Timestamp"},
		AllowCredentials: false,
	}))

	if rateLimitMs > 0 {
		app.Use("/api/tool", limiter.New(limiter.Config{
			Max:        1,
			Expiration: time.Duration(rateLimitMs) * time.Millisecond,
			KeyGenerator: func(_ fiber.Ctx) string {
				return "global"
			},
			LimitReached: func(c fiber.Ctx) error {
				return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
					"error":     publicErrorFromKey("rate_limit_exceeded"),
					"rateLimit": true,
				})
			},
		}))
	}

	app.Post("/api/tool/ping", authMiddleware(withTimeout(handleToolPing, 30*time.Second)))
	app.Post("/api/tool/ping/stream", authMiddleware(handleToolPingStream))
	app.Post("/api/tool/traceroute", authMiddleware(withTimeout(handleToolTraceroute, 70*time.Second)))
	app.Post("/api/tool/traceroute/stream", authMiddleware(handleToolTracerouteStream))
	app.Post("/api/tool/bird", authMiddleware(withTimeout(handleToolBird, 35*time.Second)))
	app.Get("/api/health", healthcheck.New())

	log.Printf("[INFO] Starting on %s", listenAddr)
	log.Printf("[INFO] BIRD socket: %s", birdSocket)

	if err := app.Listen(listenAddr); err != nil {
		log.Fatalf("[ERROR] Server failed: %v", err)
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

package main

import (
	"flag"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
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
		setRateLimitInterval(time.Duration(rateLimitMs) * time.Millisecond)
		log.Printf("[INFO] Rate limit: %dms", rateLimitMs)
	} else {
		setRateLimitInterval(0)
		log.Printf("[INFO] Rate limit: disabled")
	}

	if hmacSecret != "" {
		setSharedSecret(hmacSecret)
		log.Printf("[INFO] HMAC verification: enabled")
	} else {
		log.Printf("[WARN] HMAC verification: disabled")
	}

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Split(allowedOrigins, ","),
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "X-Signature", "X-Timestamp"},
		AllowCredentials: false,
	}))

	app.Post("/api/query", authMiddleware(handleQuery))
	app.Get("/api/health", handleHealth)

	log.Printf("[INFO] Starting on %s", listenAddr)
	log.Printf("[INFO] BIRD socket: %s", birdSocket)

	if err := app.Listen(listenAddr); err != nil {
		log.Fatalf("[ERROR] Server failed: %v", err)
	}
}

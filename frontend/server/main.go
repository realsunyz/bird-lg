package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/static"
)

func main() {
	config := LoadConfig()

	if !fiber.IsChild() {
		log.Printf("Loaded config: %d servers, static_dir=%s", len(config.Servers), config.StaticDir)
	}

	app := fiber.New(fiber.Config{
		CaseSensitive: true,
		StrictRouting: false,
		ServerHeader:  "bird-lg",
	})

	// Middleware
	app.Use(logger.New())

	// API routes
	api := app.Group("/api")
	api.Get("/config", handleConfig(config))
	api.Post("/verify", handleVerify(config))
	api.Post("/bird", handleBird(config)) // For bird commands (SSO only)
	api.Post("/tool/ping", handleToolPing(config))
	api.Post("/tool/ping/stream", handleToolPingStream(config))
	api.Post("/tool/traceroute", handleToolTraceroute(config))
	api.Post("/tool/traceroute/stream", handleToolTracerouteStream(config))

	// Auth routes
	api.Get("/auth/login", handleLogtoLogin(config))
	api.Get("/auth/logout", handleLogtoLogout(config))
	api.Get("/callback", handleLogtoCallback(config))

	staticDir := config.StaticDir
	indexFile := filepath.Join(staticDir, "index.html")

	// Static files for assets only using static middleware
	app.Get("/_next/*", static.New(staticDir))
	app.Get("/favicon.ico", static.New(staticDir))

	// Root index
	app.Get("/", func(c fiber.Ctx) error {
		return c.SendFile(indexFile)
	})

	// SPA catch-all: serve root index.html for all other routes
	app.Get("/*", func(c fiber.Ctx) error {
		path := c.Path()

		// Check if it's a static file request
		fullPath := filepath.Join(staticDir, path)
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			return c.SendFile(fullPath)
		}

		// Otherwise serve root index.html for SPA routing
		return c.SendFile(indexFile)
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

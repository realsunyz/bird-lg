package main

import (
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"

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
	api.Post("/bird", handleBird(config))
	api.Post("/tool/ping", handleToolPing(config))
	api.Post("/tool/ping/stream", handleToolPingStream(config))
	api.Post("/tool/traceroute", handleToolTraceroute(config))
	api.Post("/tool/traceroute/stream", handleToolTracerouteStream(config))

	// Auth routes
	api.Get("/auth/login", handleLogtoLogin(config))
	api.Get("/auth/logout", handleLogtoLogout(config))
	app.Get("/auth/callback", handleLogtoCallback(config))

	staticDir := config.StaticDir
	indexFile := filepath.Join(staticDir, "index.html")

	app.Use(static.New(staticDir))

	// Root index
	app.Get("/", func(c fiber.Ctx) error {
		return c.SendFile(indexFile)
	})

	// SPA catch-all: serve root index.html for all other routes
	app.Get("/*", func(c fiber.Ctx) error {
		reqPath := c.Path()

		// Check if it's a static file request
		rel := strings.TrimPrefix(reqPath, "/")
		rel = strings.TrimPrefix(path.Clean("/"+rel), "/")
		if rel != "" && rel != "." {
			fullPath := filepath.Join(staticDir, rel)

			absStaticDir, err1 := filepath.Abs(staticDir)
			absFullPath, err2 := filepath.Abs(fullPath)
			if err1 == nil && err2 == nil {
				if absFullPath != absStaticDir && !strings.HasPrefix(absFullPath, absStaticDir+string(os.PathSeparator)) {
					return c.SendStatus(fiber.StatusNotFound)
				}
			}

			if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
				return c.SendFile(fullPath)
			}
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

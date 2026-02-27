package main

import (
	"log"

	appserver "bird-lg/server/internal/app"
	"bird-lg/server/internal/config"
	"github.com/gofiber/fiber/v3"
)

func main() {
	cfg := config.LoadConfig()

	if !fiber.IsChild() {
		log.Printf("Loaded config: %d servers, static_dir=%s", len(cfg.Servers), cfg.StaticDir)
	}

	app := appserver.NewServer(cfg)

	if !fiber.IsChild() {
		log.Printf("Starting server on %s (prefork: %v)", cfg.ListenAddr, false)
	}
	if err := app.Listen(cfg.ListenAddr, fiber.ListenConfig{EnablePrefork: false}); err != nil {
		log.Fatal(err)
	}
}

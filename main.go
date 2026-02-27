package main

import (
	appserver "bird-lg/server/internal/app"
	"bird-lg/server/internal/config"
	"bird-lg/server/internal/logx"
	"github.com/gofiber/fiber/v3"
)

func main() {
	cfg := config.LoadConfig()

	if !fiber.IsChild() {
		logx.Infof("Loaded config: %d servers, static_dir=%s", len(cfg.Servers), cfg.StaticDir)
	}

	app := appserver.NewServer(cfg)

	if !fiber.IsChild() {
		logx.Infof("Starting server on %s (prefork: %v)", cfg.ListenAddr, false)
	}
	if err := app.Listen(cfg.ListenAddr, fiber.ListenConfig{EnablePrefork: false}); err != nil {
		logx.Fatalf("%v", err)
	}
}

package main

import (
	bootstrap "bird-lg/server/internal/server/bootstrap"
	"bird-lg/server/internal/server/platform/config"
	"bird-lg/server/internal/server/platform/logx"
	"github.com/gofiber/fiber/v3"
)

func main() {
	cfg := config.LoadConfig()

	if !fiber.IsChild() {
		logx.Infof("Loaded config: %d servers, static_dir=%s", len(cfg.Servers), cfg.StaticDir)
	}

	app := bootstrap.NewServer(cfg)

	if !fiber.IsChild() {
		logx.Infof("Starting server on %s (prefork: %v)", cfg.ListenAddr, false)
	}
	if err := app.Listen(cfg.ListenAddr, fiber.ListenConfig{EnablePrefork: false}); err != nil {
		logx.Fatalf("%v", err)
	}
}

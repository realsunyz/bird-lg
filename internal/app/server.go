package app

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"bird-lg/server/api"
	apiclient "bird-lg/server/api/client"
	"bird-lg/server/internal/config"
	"bird-lg/server/internal/logx"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/etag"
	"github.com/gofiber/fiber/v3/middleware/favicon"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	recovermw "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/static"
)

func NewServer(cfg *config.Config) *fiber.App {
	staticDir := cfg.StaticDir
	indexFile := filepath.Join(staticDir, "index.html")

	app := fiber.New(fiber.Config{
		CaseSensitive: true,
		StrictRouting: false,
		ServerHeader:  "sunyznet",
		JSONEncoder:   apiclient.JSONMarshal,
		JSONDecoder:   apiclient.JSONUnmarshal,
	})

	app.Use(recovermw.New())
	app.Use(requestLogMiddleware())
	app.Use(helmet.New(helmet.Config{
		XFrameOptions:      "DENY",
		ReferrerPolicy:     "strict-origin-when-cross-origin",
		ContentTypeNosniff: "nosniff",
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

	api.Register(app, cfg)

	app.Get("/", func(c fiber.Ctx) error {
		return c.SendFile(indexFile)
	})
	app.Get("/detail/:serverId", func(c fiber.Ctx) error {
		return c.SendFile(indexFile)
	})

	app.Use(static.New(staticDir))

	app.Get("*", func(c fiber.Ctx) error {
		if strings.HasPrefix(c.Path(), "/api/") || strings.HasPrefix(c.Path(), "/auth/") {
			return c.SendStatus(fiber.StatusNotFound)
		}
		if filepath.Ext(c.Path()) != "" {
			return c.SendStatus(fiber.StatusNotFound)
		}
		return c.Status(fiber.StatusNotFound).SendFile(indexFile)
	})

	app.Use(func(c fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNotFound)
	})

	return app
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

func requestLogMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()

		status := c.Response().StatusCode()
		if err != nil {
			if ferr, ok := err.(*fiber.Error); ok {
				status = ferr.Code
			} else if status < fiber.StatusBadRequest {
				status = fiber.StatusInternalServerError
			}
		}

		if status >= fiber.StatusBadRequest && status != fiber.StatusNotFound {
			msg := fmt.Sprintf(
				"%s %s status=%d dur_ms=%d ip=%s",
				c.Method(),
				c.OriginalURL(),
				status,
				time.Since(start).Milliseconds(),
				c.IP(),
			)
			logx.Warnf("%s", msg)
		}

		return err
	}
}

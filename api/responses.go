package api

import (
	"time"

	errx "bird-lg/server/internal/errors"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/timeout"
)

func WithTimeout(handler fiber.Handler, d time.Duration) fiber.Handler {
	return timeout.New(handler, timeout.Config{
		Timeout: d,
		OnTimeout: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusRequestTimeout).JSON(fiber.Map{
				"error": errx.FormatPublicError(errx.ErrCodeReqTimeout, "Request timeout"),
			})
		},
	})
}

func ProxyErrorResponse(c fiber.Ctx, err error) error {
	if fiberErr, ok := err.(*fiber.Error); ok {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": fiberErr.Message})
	}
	return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
		"error": errx.FormatPublicError(errx.ErrCodeUpstreamBadStatus, "Upstream client returned an error"),
	})
}

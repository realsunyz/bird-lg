package middleware

import (
	"time"

	"bird-lg/client/internal/platform"
	"github.com/gofiber/fiber/v3"
	timeoutmw "github.com/gofiber/fiber/v3/middleware/timeout"
)

func WithTimeout(handler fiber.Handler, d time.Duration) fiber.Handler {
	return timeoutmw.New(handler, timeoutmw.Config{
		Timeout: d,
		OnTimeout: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusRequestTimeout).JSON(fiber.Map{
				"error": platform.FormatPublicError("ERR-REQ-408", "Request timeout"),
			})
		},
	})
}

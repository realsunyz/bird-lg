package middleware

import (
	"time"

	"bird-lg/server/internal/server/platform/logx"
	"github.com/gofiber/fiber/v3"
)

func RequestLog() fiber.Handler {
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
			logx.Warnf("%s %s status=%d dur_ms=%d ip=%s", c.Method(), c.OriginalURL(), status, time.Since(start).Milliseconds(), c.IP())
		}
		return err
	}
}

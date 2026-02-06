package main

import (
	"github.com/gofiber/fiber/v3"
)

func handleHealth(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok"})
}

func isAllowedCommand(cmd string) bool {
	allowed := []string{
		"show route",
		"show protocols",
		"show protocol",
		"show status",
		"show memory",
		"show interfaces",
		"show ospf",
		"show bfd",
		"show roa",
		"show static",
		"show symbols",
	}

	for _, prefix := range allowed {
		if len(cmd) >= len(prefix) && cmd[:len(prefix)] == prefix {
			return true
		}
	}

	return false
}

package main

import (
	"bytes"
	"os/exec"
	"strings"

	"github.com/gofiber/fiber/v3"
)

type WhoisRequest struct {
	Query string `json:"query"`
}

type WhoisResponse struct {
	Bogon     bool              `json:"bogon,omitempty"`
	ReasonKey string            `json:"reasonKey,omitempty"`
	Params    map[string]string `json:"params,omitempty"`
	Result    string            `json:"result,omitempty"`
}

func handleWhois() fiber.Handler {
	return func(c fiber.Ctx) error {
		var req WhoisRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
		}

		query := strings.TrimSpace(req.Query)
		if query == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "empty_query"})
		}

		// Check for bogon addresses
		bogonResult := CheckBogon(query)
		if bogonResult.IsBogon {
			return c.JSON(WhoisResponse{
				Bogon:     true,
				ReasonKey: bogonResult.ReasonKey,
				Params:    bogonResult.Params,
			})
		}

		// Run system whois command
		result, err := runWhois(query)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "whois_failed"})
		}

		return c.JSON(WhoisResponse{Result: result})
	}
}

func runWhois(query string) (string, error) {
	cmd := exec.Command("whois", query)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		// whois command may return non-zero for some queries but still have output
		if stdout.Len() > 0 {
			return stdout.String(), nil
		}
		return "", err
	}

	return stdout.String(), nil
}

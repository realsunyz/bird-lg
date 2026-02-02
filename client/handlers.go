package main

import (
	"github.com/gofiber/fiber/v3"
)

type ApiRequest struct {
	Servers []string `json:"servers"`
	Type    string   `json:"type"`
	Args    string   `json:"args"`
}

type ApiGenericResultPair struct {
	Server string `json:"server"`
	Data   string `json:"data"`
}

type ApiSummaryResultPair struct {
	Server string           `json:"server"`
	Data   []SummaryRowData `json:"data"`
}

type ApiGenericResponse struct {
	Error  string                 `json:"error,omitempty"`
	Result []ApiGenericResultPair `json:"result,omitempty"`
}

type ApiSummaryResponse struct {
	Error  string                 `json:"error,omitempty"`
	Result []ApiSummaryResultPair `json:"result,omitempty"`
}

func handleQuery(c fiber.Ctx) error {
	if !checkRateLimit() {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":     "rate_limit_exceeded",
			"rateLimit": true,
		})
	}

	var req ApiRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
	}

	switch req.Type {
	case "summary":
		return handleSummary(c)
	case "bird":
		return handleBird(c, req)
	case "traceroute":
		return handleTraceroute(c, req)
	case "ping":
		return handlePing(c, req)
	case "mtr":
		return handleMtr(c, req)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unknown_query_type"})
	}
}

func handleSummary(c fiber.Ctx) error {
	output, err := queryBird("show protocols")
	if err != nil {
		return c.JSON(ApiSummaryResponse{Error: "bird_query_failed"})
	}

	summary := parseSummary(output)
	return c.JSON(ApiSummaryResponse{
		Result: []ApiSummaryResultPair{
			{Server: "local", Data: summary},
		},
	})
}

func handleBird(c fiber.Ctx, req ApiRequest) error {
	if !isAllowedCommand(req.Args) {
		return c.JSON(ApiGenericResponse{Error: "command_not_allowed"})
	}

	output, err := queryBird(req.Args)
	if err != nil {
		return c.JSON(ApiGenericResponse{Error: "bird_query_failed"})
	}

	return c.JSON(ApiGenericResponse{
		Result: []ApiGenericResultPair{
			{Server: "local", Data: output},
		},
	})
}

func handleTraceroute(c fiber.Ctx, req ApiRequest) error {
	output, err := runTraceroute(req.Args)
	if err != nil {
		return c.JSON(ApiGenericResponse{Error: "traceroute_failed"})
	}

	return c.JSON(ApiGenericResponse{
		Result: []ApiGenericResultPair{
			{Server: "local", Data: output},
		},
	})
}

func handlePing(c fiber.Ctx, req ApiRequest) error {
	output, err := runPing(req.Args)
	if err != nil {
		return c.JSON(ApiGenericResponse{Error: "ping_failed"})
	}

	return c.JSON(ApiGenericResponse{
		Result: []ApiGenericResultPair{
			{Server: "local", Data: output},
		},
	})
}

func handleMtr(c fiber.Ctx, req ApiRequest) error {
	output, err := runMtr(req.Args)
	if err != nil {
		return c.JSON(ApiGenericResponse{Error: "mtr_failed"})
	}

	return c.JSON(ApiGenericResponse{
		Result: []ApiGenericResultPair{
			{Server: "local", Data: output},
		},
	})
}

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

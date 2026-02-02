package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/client"
)

func handleConfig(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		clientConfig := config.ToClientConfig()

		// Check authentication status
		token := c.Cookies(config.CookieName())
		if payload := GetValidJWTPayload(token, config.JWTSecret); payload != nil {
			clientConfig.Auth.IsAuthenticated = true
			clientConfig.Auth.AuthType = payload.AuthType
			clientConfig.Auth.User = payload.Sub
		}

		return c.JSON(clientConfig)
	}
}

type QueryRequest struct {
	Type    string `json:"type"`
	Server  string `json:"server"`
	Command string `json:"command,omitempty"`
	Target  string `json:"target,omitempty"`
}

func handleQuery(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Verify JWT (Any valid auth is fine for basic tools: ping/mtr/traceroute)
		if config.TurnstileSecretKey != "" {
			token := c.Cookies(config.CookieName())
			if token == "" || !ValidateJWT(token, config.JWTSecret) {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
			}
		}

		var req QueryRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Security: BLOCK Bird queries here. They must go through /api/bird
		if req.Type == "bird" || req.Type == "summary" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Use /api/bird for BIRD queries"})
		}

		// Find server
		var server *ServerConfig
		for i := range config.Servers {
			if config.Servers[i].ID == req.Server {
				server = &config.Servers[i]
				break
			}
		}
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Server not found"})
		}

		// Build proxy request
		proxyReq := map[string]string{"type": req.Type}
		switch req.Type {
		case "traceroute", "ping", "mtr": // Allowed tools
			proxyReq["args"] = req.Target
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query type for this endpoint"})
		}

		result, err := proxyToClient(server.Endpoint, proxyReq, config.HMACSecret)
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(result)
	}
}

func handleBird(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Strict Auth Check: Must be Logto SSO
		token := c.Cookies(config.CookieName())
		payload := GetValidJWTPayload(token, config.JWTSecret)
		if payload == nil || payload.AuthType != AuthTypeLogto {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "SSO authentication required"})
		}

		var req QueryRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Find server
		var server *ServerConfig
		for i := range config.Servers {
			if config.Servers[i].ID == req.Server {
				server = &config.Servers[i]
				break
			}
		}
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Server not found"})
		}

		// Build proxy request
		proxyReq := map[string]string{"type": req.Type}
		switch req.Type {
		case "bird":
			proxyReq["args"] = req.Command
		case "summary":
			// Summary is a special case of bird query in client
			proxyReq["type"] = "summary"
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query type for bird endpoint"})
		}

		result, err := proxyToClient(server.Endpoint, proxyReq, config.HMACSecret)
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(result)
	}
}

func proxyToClient(endpoint string, request map[string]string, hmacSecret string) (interface{}, error) {
	body, _ := json.Marshal(request)

	cc := client.New()
	cc.SetTimeout(30 * time.Second)

	req := cc.R()
	req.SetURL(endpoint + "/api/query")
	req.SetJSON(request)

	if hmacSecret != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		h := hmac.New(sha256.New, []byte(hmacSecret))
		h.Write([]byte(timestamp + ":" + string(body)))
		signature := base64.StdEncoding.EncodeToString(h.Sum(nil))
		req.AddHeader("X-Signature", signature)
		req.AddHeader("X-Timestamp", timestamp)
	}

	resp, err := req.Post(endpoint + "/api/query")
	if err != nil {
		return nil, fiber.NewError(fiber.StatusBadGateway, "failed to connect to client")
	}

	// Parse response regardless of status code (for rate limit responses)
	var result interface{}
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, err
	}

	// Return rate limit response as-is (status 429)
	if resp.StatusCode() == fiber.StatusTooManyRequests {
		return result, nil
	}

	if resp.StatusCode() != fiber.StatusOK {
		return nil, fiber.NewError(fiber.StatusBadGateway, "client error: "+strconv.Itoa(resp.StatusCode()))
	}

	return result, nil
}

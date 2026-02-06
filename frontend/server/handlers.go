package main

import (
	"bufio"
	"crypto/hmac"
	"crypto/sha256"
	"embed"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"time"

	"bird-lg/server/models"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/client"
)

//go:embed dist/*
var content embed.FS

type marshaler interface {
	MarshalJSON() ([]byte, error)
}

func handleConfig(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		clientConfig := config.ToClientConfig()

		token := c.Cookies(config.CookieName())
		if payload := GetValidJWTPayload(token, config.JWTSecret); payload != nil {
			clientConfig.Auth.IsAuthenticated = true
			clientConfig.Auth.AuthType = payload.AuthType
			clientConfig.Auth.User = payload.Sub
		}

		return c.JSON(clientConfig)
	}
}

func requireBasicAuth(config *Config, c fiber.Ctx) bool {
	if config.TurnstileSecretKey == "" {
		return true
	}
	token := c.Cookies(config.CookieName())
	return token != "" && ValidateJWT(token, config.JWTSecret)
}

func findServer(config *Config, id string) *ServerConfig {
	for i := range config.Servers {
		if config.Servers[i].ID == id {
			return &config.Servers[i]
		}
	}
	return nil
}

func handleToolPing(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !requireBasicAuth(config, c) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		var req models.ToolRunRequest
		if err := req.UnmarshalJSON(c.Body()); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
		}

		server := findServer(config, req.Server)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "server_not_found"})
		}

		result, err := proxyToClientPath(server.Endpoint, "/api/tool/ping", models.TargetRequest{Target: req.Target}, config.HMACSecret)
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(result)
	}
}

func handleToolPingStream(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !requireBasicAuth(config, c) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		serverID := c.Query("server")
		target := c.Query("target")

		if serverID == "" || target == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
		}

		server := findServer(config, serverID)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "server_not_found"})
		}

		count, _ := strconv.Atoi(c.Query("count"))
		reqObj := models.PingStreamRequest{Target: target, Count: count}
		reqBody, _ := reqObj.MarshalJSON()

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Transfer-Encoding", "chunked")

		c.RequestCtx().SetBodyStreamWriter(func(w *bufio.Writer) {
			cc := client.New()
			if fc := cc.FasthttpClient(); fc != nil {
				fc.StreamResponseBody = true
			}

			req := cc.R()
			resp := client.AcquireResponse()
			defer client.ReleaseRequest(req)
			defer client.ReleaseResponse(resp)

			rawReq := req.RawRequest
			rawReq.SetRequestURI(server.Endpoint + "/api/tool/ping/stream")
			rawReq.Header.SetMethod(fiber.MethodPost)
			rawReq.Header.SetContentType("application/json")
			rawReq.SetBody(reqBody)

			if config.HMACSecret != "" {
				timestamp := strconv.FormatInt(time.Now().Unix(), 10)
				signature := computeSignature(config.HMACSecret, timestamp, fiber.MethodPost, "/api/tool/ping/stream", reqBody)
				rawReq.Header.Set("X-Signature", signature)
				rawReq.Header.Set("X-Timestamp", timestamp)
			}

			if err := cc.DoTimeout(rawReq, resp.RawResponse, 30*time.Second); err != nil {
				fmt.Fprintf(w, "error: %v\n", err)
				return
			}

			stream := resp.RawResponse.BodyStream()
			if stream == nil {
				fmt.Fprint(w, string(resp.Body()))
				return
			}

			reader := bufio.NewReader(stream)
			for {
				line, err := reader.ReadString('\n')
				if err != nil {
					break
				}
				fmt.Fprint(w, line)
				w.Flush()
			}
		})

		return nil
	}
}

func handleToolTracerouteStream(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !requireBasicAuth(config, c) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		serverID := c.Query("server")
		target := c.Query("target")

		if serverID == "" || target == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
		}

		server := findServer(config, serverID)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "server_not_found"})
		}

		reqObj := models.TargetRequest{Target: target}
		reqBody, _ := reqObj.MarshalJSON()

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Transfer-Encoding", "chunked")

		c.RequestCtx().SetBodyStreamWriter(func(w *bufio.Writer) {
			cc := client.New()
			if fc := cc.FasthttpClient(); fc != nil {
				fc.StreamResponseBody = true
			}

			req := cc.R()
			resp := client.AcquireResponse()
			defer client.ReleaseRequest(req)
			defer client.ReleaseResponse(resp)

			rawReq := req.RawRequest
			rawReq.SetRequestURI(server.Endpoint + "/api/tool/traceroute/stream")
			rawReq.Header.SetMethod(fiber.MethodPost)
			rawReq.Header.SetContentType("application/json")
			rawReq.SetBody(reqBody)

			if config.HMACSecret != "" {
				timestamp := strconv.FormatInt(time.Now().Unix(), 10)
				signature := computeSignature(config.HMACSecret, timestamp, fiber.MethodPost, "/api/tool/traceroute/stream", reqBody)
				rawReq.Header.Set("X-Signature", signature)
				rawReq.Header.Set("X-Timestamp", timestamp)
			}

			if err := cc.DoTimeout(rawReq, resp.RawResponse, 60*time.Second); err != nil {
				fmt.Fprintf(w, "error: %v\n", err)
				return
			}

			stream := resp.RawResponse.BodyStream()
			if stream == nil {
				fmt.Fprint(w, string(resp.Body()))
				return
			}

			reader := bufio.NewReader(stream)
			for {
				line, err := reader.ReadString('\n')
				if err != nil {
					break
				}
				fmt.Fprint(w, line)
				w.Flush()
			}
		})

		return nil
	}
}

func handleToolTraceroute(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !requireBasicAuth(config, c) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		var req models.ToolRunRequest
		if err := req.UnmarshalJSON(c.Body()); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request"})
		}

		server := findServer(config, req.Server)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "server_not_found"})
		}

		result, err := proxyToClientPath(server.Endpoint, "/api/tool/traceroute", models.TargetRequest{Target: req.Target}, config.HMACSecret)
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(result)
	}
}

func handleBird(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := c.Cookies(config.CookieName())
		payload := GetValidJWTPayload(token, config.JWTSecret)
		if payload == nil || payload.AuthType != AuthTypeLogto {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "SSO authentication required"})
		}

		var req models.QueryRequest
		if err := req.UnmarshalJSON(c.Body()); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

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

		switch req.Type {
		case "bird":
			proxyReq := models.BirdCommandRequest{
				Command: req.Command,
			}
			result, err := proxyToClientPath(server.Endpoint, "/api/tool/bird", proxyReq, config.HMACSecret)
			if err != nil {
				return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
			}
			return c.JSON(result)
		case "summary":
			proxyReq := models.BirdCommandRequest{
				Command: "show protocols",
			}
			result, err := proxyToClientPath(server.Endpoint, "/api/tool/bird", proxyReq, config.HMACSecret)
			if err != nil {
				return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
			}
			if m, ok := result.(models.GenericResponse); ok {
				if _, hasError := m["error"]; hasError {
					return c.JSON(result)
				}
			}

			output := ""
			if m, ok := result.(models.GenericResponse); ok {
				if resAny, ok := m["result"].([]any); ok && len(resAny) > 0 {
					if first, ok := resAny[0].(map[string]any); ok {
						if data, ok := first["data"].(string); ok {
							output = data
						}
					}
				}
			}

			summary := parseProtocolSummary(output)
			return c.JSON(fiber.Map{
				"result": []fiber.Map{
					{
						"server": "local",
						"data":   summary,
					},
				},
			})
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query type for bird endpoint"})
		}
	}
}

func computeSignature(secret, timestamp, method, requestURI string, body []byte) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(timestamp + ":" + method + ":" + requestURI + ":" + string(body)))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func proxyToClientPath(endpoint, path string, request marshaler, hmacSecret string) (interface{}, error) {
	body, err := request.MarshalJSON()
	if err != nil {
		return nil, err
	}

	cc := client.New()
	cc.SetTimeout(30 * time.Second)

	req := cc.R()
	req.SetHeader("Content-Type", "application/json")
	req.SetRawBody(body)

	if hmacSecret != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		signature := computeSignature(hmacSecret, timestamp, fiber.MethodPost, path, body)
		req.SetHeader("X-Signature", signature)
		req.SetHeader("X-Timestamp", timestamp)
	}

	resp, err := req.Post(endpoint + path)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusBadGateway, "failed to connect to client")
	}

	var result models.GenericResponse
	if err := result.UnmarshalJSON(resp.Body()); err != nil {
		return nil, err
	}

	if resp.StatusCode() == fiber.StatusTooManyRequests {
		return result, nil
	}

	if resp.StatusCode() != fiber.StatusOK {
		return nil, fiber.NewError(fiber.StatusBadGateway, "client error: "+strconv.Itoa(resp.StatusCode()))
	}

	return result, nil
}

func parseProtocolSummary(output string) []models.ProtocolSummaryRow {
	var result []models.ProtocolSummaryRow
	lines := strings.Split(output, "\n")

	headerSkipped := false
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if !headerSkipped && strings.HasPrefix(line, "Name") {
			headerSkipped = true
			continue
		}

		fields := strings.Fields(line)
		if len(fields) >= 5 {
			row := models.ProtocolSummaryRow{
				Name:  fields[0],
				Proto: fields[1],
				Table: fields[2],
				State: fields[3],
				Since: fields[4],
			}
			if len(fields) > 5 {
				row.Info = strings.Join(fields[5:], " ")
			}
			result = append(result, row)
		}
	}

	return result
}

package main

import (
	"bufio"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"time"

	"bird-lg/server/models"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/client"
)

type marshaler interface {
	MarshalJSON() ([]byte, error)
}

type streamBodyBuilder func(c fiber.Ctx, target string) ([]byte, error)

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

func unauthorizedToolResponse(c fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": formatPublicError(errCodeAuthUnauthorized, "Authentication required")})
}

func proxyErrorResponse(c fiber.Ctx, err error) error {
	if fiberErr, ok := err.(*fiber.Error); ok {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": fiberErr.Message})
	}
	return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": formatPublicError(errCodeUpstreamBadStatus, "Upstream client returned an error")})
}

func handleToolRequest(config *Config, upstreamPath string) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !requireBasicAuth(config, c) {
			return unauthorizedToolResponse(c)
		}

		var req models.ToolRunRequest
		if err := req.UnmarshalJSON(c.Body()); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": publicErrorFromKey("invalid_request")})
		}

		server := findServer(config, req.Server)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": publicErrorFromKey("server_not_found")})
		}

		result, err := proxyToClientPath(server.Endpoint, upstreamPath, models.TargetRequest{Target: req.Target}, config.HMACSecret)
		if err != nil {
			return proxyErrorResponse(c, err)
		}
		return c.JSON(result)
	}
}

func handleToolStream(config *Config, upstreamPath string, timeout time.Duration, buildBody streamBodyBuilder) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !requireBasicAuth(config, c) {
			return unauthorizedToolResponse(c)
		}

		serverID := c.Query("server")
		target := c.Query("target")

		if serverID == "" || target == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": publicErrorFromKey("invalid_request")})
		}

		server := findServer(config, serverID)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": publicErrorFromKey("server_not_found")})
		}

		reqBody, err := buildBody(c, target)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": publicErrorFromKey("invalid_request")})
		}

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Transfer-Encoding", "chunked")

		c.RequestCtx().SetBodyStreamWriter(func(w *bufio.Writer) {
			streamFromUpstream(w, server.Endpoint, upstreamPath, reqBody, config.HMACSecret, timeout)
		})

		return nil
	}
}

func streamFromUpstream(w *bufio.Writer, endpoint, upstreamPath string, reqBody []byte, hmacSecret string, timeout time.Duration) {
	cc := client.New()
	if fc := cc.FasthttpClient(); fc != nil {
		fc.StreamResponseBody = true
	}

	req := cc.R()
	resp := client.AcquireResponse()
	defer client.ReleaseRequest(req)
	defer client.ReleaseResponse(resp)

	rawReq := req.RawRequest
	rawReq.SetRequestURI(endpoint + upstreamPath)
	rawReq.Header.SetMethod(fiber.MethodPost)
	rawReq.Header.SetContentType("application/json")
	rawReq.SetBody(reqBody)

	if hmacSecret != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		signature := computeSignature(hmacSecret, timestamp, fiber.MethodPost, upstreamPath, reqBody)
		rawReq.Header.Set("X-Signature", signature)
		rawReq.Header.Set("X-Timestamp", timestamp)
	}

	if err := cc.DoTimeout(rawReq, resp.RawResponse, timeout); err != nil {
		fmt.Fprintf(w, "error: %s\n", formatPublicError(errCodeUpstreamConnectFailed, "Failed to connect to upstream client"))
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
}

func handleToolPing(config *Config) fiber.Handler {
	return handleToolRequest(config, "/api/tool/ping")
}

func handleToolPingStream(config *Config) fiber.Handler {
	return handleToolStream(config, "/api/tool/ping/stream", 30*time.Second, func(c fiber.Ctx, target string) ([]byte, error) {
		count, _ := strconv.Atoi(c.Query("count"))
		reqObj := models.PingStreamRequest{Target: target, Count: count}
		return reqObj.MarshalJSON()
	})
}

func handleToolTraceroute(config *Config) fiber.Handler {
	return handleToolRequest(config, "/api/tool/traceroute")
}

func handleToolTracerouteStream(config *Config) fiber.Handler {
	return handleToolStream(config, "/api/tool/traceroute/stream", 60*time.Second, func(_ fiber.Ctx, target string) ([]byte, error) {
		reqObj := models.TargetRequest{Target: target}
		return reqObj.MarshalJSON()
	})
}

func proxyBirdCommand(endpoint, command, hmacSecret string) (models.ApiGenericResponse, error) {
	return proxyToClientPath(endpoint, "/api/tool/bird", models.BirdCommandRequest{
		Command: command,
	}, hmacSecret)
}

func handleBird(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := c.Cookies(config.CookieName())
		payload := GetValidJWTPayload(token, config.JWTSecret)
		if payload == nil || payload.AuthType != AuthTypeLogto {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": formatPublicError(errCodeAuthSSORequired, "SSO authentication required")})
		}

		var req models.QueryRequest
		if err := req.UnmarshalJSON(c.Body()); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": publicErrorFromKey("invalid_request")})
		}

		server := findServer(config, req.Server)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": publicErrorFromKey("server_not_found")})
		}

		switch req.Type {
		case "bird":
			result, err := proxyBirdCommand(server.Endpoint, req.Command, config.HMACSecret)
			if err != nil {
				return proxyErrorResponse(c, err)
			}
			return c.JSON(result)
		case "summary":
			result, err := proxyBirdCommand(server.Endpoint, "show protocols", config.HMACSecret)
			if err != nil {
				return proxyErrorResponse(c, err)
			}
			if result.Error != "" {
				return c.JSON(result)
			}

			output := ""
			if len(result.Result) > 0 {
				output = result.Result[0].Data
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
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": formatPublicError(errCodeReqBadRequest, "Invalid query type for bird endpoint")})
		}
	}
}

func computeSignature(secret, timestamp, method, requestURI string, body []byte) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(timestamp + ":" + method + ":" + requestURI + ":" + string(body)))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func proxyToClientPath(endpoint, path string, request marshaler, hmacSecret string) (models.ApiGenericResponse, error) {
	body, err := request.MarshalJSON()
	if err != nil {
		return models.ApiGenericResponse{}, err
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
		return models.ApiGenericResponse{}, fiber.NewError(fiber.StatusBadGateway, formatPublicError(errCodeUpstreamConnectFailed, "Failed to connect to upstream client"))
	}

	var result models.ApiGenericResponse
	if err := result.UnmarshalJSON(resp.Body()); err != nil {
		return models.ApiGenericResponse{}, err
	}

	if resp.StatusCode() == fiber.StatusTooManyRequests {
		return result, nil
	}

	if resp.StatusCode() != fiber.StatusOK {
		return models.ApiGenericResponse{}, fiber.NewError(fiber.StatusBadGateway, formatPublicError(errCodeUpstreamBadStatus, "Upstream client returned an error"))
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

package api

import (
	"bufio"
	"strconv"
	"strings"
	"time"

	apiclient "bird-lg/server/api/client"
	"bird-lg/server/internal/auth"
	"bird-lg/server/internal/captcha"
	"bird-lg/server/internal/config"
	errx "bird-lg/server/internal/errors"
	"bird-lg/server/internal/model"
	"bird-lg/server/internal/validation"

	jwtware "github.com/gofiber/contrib/v3/jwt"
	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

type StreamBodyBuilder func(c fiber.Ctx, target string) (any, error)

func HandleConfig(cfg *config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		clientConfig := cfg.ToClientConfig()
		token := c.Cookies(cfg.CookieName())
		if payload := auth.GetValidJWTPayload(token, cfg.JWTSecret); payload != nil {
			clientConfig.Auth.IsAuthenticated = true
			clientConfig.Auth.AuthType = payload.AuthType
			clientConfig.Auth.User = payload.Sub
		}
		return c.JSON(clientConfig)
	}
}

func HandleLogtoLogin(cfg *config.Config) fiber.Handler {
	return auth.HandleLogtoLogin(cfg)
}

func HandleLogtoLogout(cfg *config.Config) fiber.Handler {
	return auth.HandleLogtoLogout(cfg)
}

func HandleLogtoCallback(cfg *config.Config) fiber.Handler {
	return auth.HandleLogtoCallback(cfg)
}

func HandleVerify(cfg *config.Config) fiber.Handler {
	return captcha.HandleVerify(cfg)
}

func proxyBirdCommand(endpoint, command, hmacSecret string) (model.APIGenericResponse, error) {
	return apiclient.ProxyToClientPath(endpoint, "/api/tool/bird", model.BirdCommandRequest{Command: command}, hmacSecret)
}

func HandleBird(cfg *config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := jwtware.FromContext(c)
		if token == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeAuthSSORequired, "SSO authentication required")})
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || auth.ClaimString(claims, "auth_type") != auth.AuthTypeLogto {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeAuthSSORequired, "SSO authentication required")})
		}

		var req model.QueryRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}

		server := cfg.FindServer(req.Server)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": errx.PublicErrorFromKey("server_not_found")})
		}

		switch req.Type {
		case "bird":
			result, err := proxyBirdCommand(server.Endpoint, req.Command, cfg.HMACSecret)
			if err != nil {
				return ProxyErrorResponse(c, err)
			}
			return c.JSON(result)
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeReqBadRequest, "Invalid query type for bird endpoint")})
		}
	}
}

func handleToolRequest(cfg *config.Config, upstreamPath string) fiber.Handler {
	return func(c fiber.Ctx) error {
		var req model.ToolRunRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}

		normalizedTarget, targetErrorKey := validation.ValidateToolTarget(req.Target)
		if targetErrorKey != "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey(targetErrorKey)})
		}
		req.Target = normalizedTarget

		server := cfg.FindServer(req.Server)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": errx.PublicErrorFromKey("server_not_found")})
		}

		result, err := apiclient.ProxyToClientPath(server.Endpoint, upstreamPath, model.TargetRequest{Target: req.Target}, cfg.HMACSecret)
		if err != nil {
			return ProxyErrorResponse(c, err)
		}
		return c.JSON(result)
	}
}

func handleToolStream(cfg *config.Config, upstreamPath string, timeout time.Duration, buildBody StreamBodyBuilder) fiber.Handler {
	return func(c fiber.Ctx) error {
		serverID := strings.TrimSpace(c.Query("server"))
		target := c.Query("target")
		if serverID == "" || target == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}

		normalizedTarget, targetErrorKey := validation.ValidateToolTarget(target)
		if targetErrorKey != "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey(targetErrorKey)})
		}

		server := cfg.FindServer(serverID)
		if server == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": errx.PublicErrorFromKey("server_not_found")})
		}

		reqPayload, err := buildBody(c, normalizedTarget)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Transfer-Encoding", "chunked")
		c.RequestCtx().SetBodyStreamWriter(func(w *bufio.Writer) {
			apiclient.StreamFromUpstream(w, server.Endpoint, upstreamPath, reqPayload, cfg.HMACSecret, timeout)
		})
		return nil
	}
}

func HandleToolPing(cfg *config.Config) fiber.Handler {
	return handleToolRequest(cfg, "/api/tool/ping")
}

func HandleToolPingStream(cfg *config.Config) fiber.Handler {
	return handleToolStream(cfg, "/api/tool/ping/stream", 30*time.Second, func(c fiber.Ctx, target string) (any, error) {
		count, _ := strconv.Atoi(c.Query("count"))
		return model.PingStreamRequest{Target: target, Count: count}, nil
	})
}

func HandleToolTraceroute(cfg *config.Config) fiber.Handler {
	return handleToolRequest(cfg, "/api/tool/traceroute")
}

func HandleToolTracerouteStream(cfg *config.Config) fiber.Handler {
	return handleToolStream(cfg, "/api/tool/traceroute/stream", 60*time.Second, func(_ fiber.Ctx, target string) (any, error) {
		return model.TargetRequest{Target: target}, nil
	})
}

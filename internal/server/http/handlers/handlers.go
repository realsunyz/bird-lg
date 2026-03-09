package handlers

import (
	"bufio"
	"strconv"
	"strings"
	"time"

	"bird-lg/server/internal/server/domain/model"
	platformconfig "bird-lg/server/internal/server/platform/config"
	errx "bird-lg/server/internal/server/platform/errors"
	"bird-lg/server/internal/server/platform/upstream"
	authsvc "bird-lg/server/internal/server/services/auth"
	birdsvc "bird-lg/server/internal/server/services/bird"
	configsvc "bird-lg/server/internal/server/services/config"
	toolsvc "bird-lg/server/internal/server/services/tool"
	jwtware "github.com/gofiber/contrib/v3/jwt"
	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

type StreamBodyBuilder func(c fiber.Ctx, target string) (any, error)

type AuthStatusResponse struct {
	IsAuthenticated bool   `json:"isAuthenticated"`
	User            string `json:"user,omitempty"`
	AuthType        string `json:"authType,omitempty"`
}

func HandleConfig(cfg *platformconfig.Config) fiber.Handler {
	service := configsvc.NewService(cfg)

	return func(c fiber.Ctx) error {
		payload, etag, marshalErr := service.Payload(c.App().Config().JSONEncoder)
		if marshalErr != nil || payload == nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to serialize config"})
		}

		c.Set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
		c.Set("ETag", etag)

		if match := strings.TrimSpace(c.Get("If-None-Match")); match != "" && match == etag {
			return c.SendStatus(fiber.StatusNotModified)
		}

		c.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSONCharsetUTF8)
		return c.Send(payload)
	}
}

func HandleAuth(cfg *platformconfig.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		c.Set("Cache-Control", "no-store")

		if payload := authsvc.GetValidJWTPayload(c.Cookies(cfg.CookieName()), cfg.JWTSecret); payload != nil {
			return c.JSON(AuthStatusResponse{
				IsAuthenticated: true,
				AuthType:        payload.AuthType,
				User:            payload.Sub,
			})
		}

		return c.JSON(AuthStatusResponse{IsAuthenticated: false})
	}
}

func HandleLogtoLogin(cfg *platformconfig.Config) fiber.Handler {
	return authsvc.HandleLogtoLogin(cfg)
}

func HandleLogtoLogout(cfg *platformconfig.Config) fiber.Handler {
	return authsvc.HandleLogtoLogout(cfg)
}

func HandleLogtoCallback(cfg *platformconfig.Config) fiber.Handler {
	return authsvc.HandleLogtoCallback(cfg)
}

func HandleVerify(cfg *platformconfig.Config) fiber.Handler {
	return authsvc.HandleVerify(cfg)
}

func HandleBird(cfg *platformconfig.Config) fiber.Handler {
	service := birdsvc.NewService(cfg)

	return func(c fiber.Ctx) error {
		token := jwtware.FromContext(c)
		if token == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeAuthSSORequired, "SSO authentication required")})
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || authsvc.ClaimString(claims, "auth_type") != authsvc.AuthTypeLogto {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeAuthSSORequired, "SSO authentication required")})
		}

		var req model.QueryRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}

		result, status, publicErr := service.Run(req.Type, req.Server, req.Command)
		if status != 0 {
			return c.Status(status).JSON(fiber.Map{"error": publicErr})
		}
		return c.JSON(result)
	}
}

func HandleToolPing(cfg *platformconfig.Config) fiber.Handler {
	return handleToolRequest(cfg, "/api/tool/ping")
}

func HandleToolPingStream(cfg *platformconfig.Config) fiber.Handler {
	return handleToolStream(cfg, "/api/tool/ping/stream", 30*time.Second, func(c fiber.Ctx, target string) (any, error) {
		count, _ := strconv.Atoi(c.Query("count"))
		return model.PingStreamRequest{Target: target, Count: count}, nil
	})
}

func HandleToolTraceroute(cfg *platformconfig.Config) fiber.Handler {
	return handleToolRequest(cfg, "/api/tool/traceroute")
}

func HandleToolTracerouteStream(cfg *platformconfig.Config) fiber.Handler {
	return handleToolStream(cfg, "/api/tool/traceroute/stream", 60*time.Second, func(_ fiber.Ctx, target string) (any, error) {
		return model.TargetRequest{Target: target}, nil
	})
}

func handleToolRequest(cfg *platformconfig.Config, upstreamPath string) fiber.Handler {
	service := toolsvc.NewService(cfg)

	return func(c fiber.Ctx) error {
		var req model.ToolRunRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}

		result, status, publicErr := service.Run(req.Server, req.Target, upstreamPath)
		if status != 0 {
			return c.Status(status).JSON(fiber.Map{"error": publicErr})
		}
		return c.JSON(result)
	}
}

func handleToolStream(cfg *platformconfig.Config, upstreamPath string, timeout time.Duration, buildBody StreamBodyBuilder) fiber.Handler {
	service := toolsvc.NewService(cfg)

	return func(c fiber.Ctx) error {
		serverID := strings.TrimSpace(c.Query("server"))
		target := c.Query("target")
		if serverID == "" || target == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}

		reqPayload, status, publicErr := service.PrepareStream(serverID, target, upstreamPath, func(normalizedTarget string) (any, error) {
			return buildBody(c, normalizedTarget)
		})
		if status != 0 {
			return c.Status(status).JSON(fiber.Map{"error": publicErr})
		}

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Transfer-Encoding", "chunked")
		c.RequestCtx().SetBodyStreamWriter(func(w *bufio.Writer) {
			upstream.StreamFromUpstream(w, reqPayload.Endpoint, reqPayload.UpstreamPath, reqPayload.Payload, cfg.HMACSecret, timeout)
		})
		return nil
	}
}

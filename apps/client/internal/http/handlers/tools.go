package handlers

import (
	"bufio"
	"context"
	"strings"
	"time"

	"bird-lg-client/internal/model"
	"bird-lg-client/internal/platform"
	"bird-lg-client/internal/runner"
	birdsvc "bird-lg-client/internal/services/bird"
	pingsvc "bird-lg-client/internal/services/ping"
	tracesvc "bird-lg-client/internal/services/traceroute"
	"bird-lg-client/internal/stream"
	"github.com/gofiber/fiber/v3"
)

const (
	PingTimeout       = 20 * time.Second
	TracerouteTimeout = 30 * time.Second
	BirdTimeout       = 10 * time.Second
)

type Handler struct {
	runner     runner.CommandRunner
	birdSocket string
}

func New(r runner.CommandRunner, birdSocket string) *Handler {
	return &Handler{runner: r, birdSocket: birdSocket}
}

func (h *Handler) Ping(c fiber.Ctx) error {
	return h.runTool(c, PingTimeout, func(req model.ToolTargetRequest) (string, []string, error) {
		return pingsvc.BuildCommand(req.Target, req.Count)
	})
}

func (h *Handler) PingStream(c fiber.Ctx) error {
	return h.streamTool(c, PingTimeout, func(req model.ToolTargetRequest) (string, []string, error) {
		return pingsvc.BuildCommand(req.Target, req.Count)
	})
}

func (h *Handler) Traceroute(c fiber.Ctx) error {
	return h.runTool(c, TracerouteTimeout, func(req model.ToolTargetRequest) (string, []string, error) {
		return tracesvc.BuildCommand(req.Target)
	})
}

func (h *Handler) TracerouteStream(c fiber.Ctx) error {
	return h.streamTool(c, TracerouteTimeout, func(req model.ToolTargetRequest) (string, []string, error) {
		return tracesvc.BuildCommand(req.Target)
	})
}

func (h *Handler) Bird(c fiber.Ctx) error {
	var req model.ToolBirdRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey("invalid_request")})
	}

	command := strings.TrimSpace(req.Command)
	if !birdsvc.IsAllowedCommand(command) {
		return c.JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey("command_not_allowed")})
	}

	output, err := birdsvc.Query(h.birdSocket, command, BirdTimeout)
	if err != nil {
		if err.Error() == "timeout" {
			return c.JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey("timeout")})
		}
		return c.JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey("bird_query_failed")})
	}

	return c.JSON(model.ApiGenericResponse{
		Result: []model.ApiGenericResultPair{{Server: "local", Data: output}},
	})
}

func (h *Handler) runTool(c fiber.Ctx, timeout time.Duration, build func(model.ToolTargetRequest) (string, []string, error)) error {
	var req model.ToolTargetRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey("invalid_request")})
	}

	bin, args, err := build(req)
	if err != nil {
		return c.JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey(err.Error())})
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	out, runErr := h.runner.CombinedOutput(ctx, bin, args)
	if ctx.Err() == context.DeadlineExceeded {
		return c.JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey("timeout")})
	}
	if runErr != nil {
		return c.JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey("exec_failed")})
	}

	return c.JSON(model.ApiGenericResponse{
		Result: []model.ApiGenericResultPair{{Server: "local", Data: string(out)}},
	})
}

func (h *Handler) streamTool(c fiber.Ctx, timeout time.Duration, build func(model.ToolTargetRequest) (string, []string, error)) error {
	var req model.ToolTargetRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey("invalid_request")})
	}

	bin, args, err := build(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ApiGenericResponse{Error: platform.PublicErrorFromKey(err.Error())})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	c.RequestCtx().SetBodyStreamWriter(func(w *bufio.Writer) {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		err := h.runner.Stream(ctx, bin, args, func(line string) {
			stream.WriteData(w, line)
		})
		if ctx.Err() == context.DeadlineExceeded {
			stream.WriteData(w, platform.PublicErrorFromKey("timeout"))
			return
		}
		if err != nil {
			stream.WriteData(w, platform.PublicErrorFromKey("exec_failed"))
		}
	})
	return nil
}

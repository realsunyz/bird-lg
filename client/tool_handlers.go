package main

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"bird-lg-client/models"

	"github.com/gofiber/fiber/v3"
)

func handleToolPing(c fiber.Ctx) error {
	if !checkRateLimit() {
		return c.JSON(fiber.Map{"error": publicErrorFromKey("rate_limit_exceeded"), "rateLimit": true})
	}

	var req models.ToolTargetRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("invalid_request")})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	bin, args, err := buildPingCommand(req.Target, req.Count)
	if err != nil {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey(err.Error())})
	}

	cmd := exec.CommandContext(ctx, bin, args...)
	out, runErr := cmd.CombinedOutput()

	if ctx.Err() == context.DeadlineExceeded {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("timeout")})
	}
	if runErr != nil {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("exec_failed")})
	}

	return c.JSON(models.ApiGenericResponse{
		Result: []models.ApiGenericResultPair{{Server: "local", Data: string(out)}},
	})
}

func handleToolPingStream(c fiber.Ctx) error {
	if !checkRateLimit() {
		return c.Status(429).JSON(fiber.Map{"error": publicErrorFromKey("rate_limit_exceeded")})
	}

	var req models.ToolTargetRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(400).JSON(models.ApiGenericResponse{Error: publicErrorFromKey("invalid_request")})
	}

	bin, args, err := buildPingCommand(req.Target, req.Count)
	if err != nil {
		return c.Status(400).JSON(models.ApiGenericResponse{Error: publicErrorFromKey(err.Error())})
	}

	// Set SSE headers
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	c.RequestCtx().SetBodyStreamWriter(func(w *bufio.Writer) {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, bin, args...)
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return
		}

		if err := cmd.Start(); err != nil {
			return
		}

		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			msg := scanner.Text()
			fmt.Fprintf(w, "data: %s\n\n", msg)
			w.Flush()
		}

		cmd.Wait()
	})

	return nil
}

func handleToolTraceroute(c fiber.Ctx) error {
	if !checkRateLimit() {
		return c.JSON(fiber.Map{"error": publicErrorFromKey("rate_limit_exceeded"), "rateLimit": true})
	}

	var req models.ToolTargetRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("invalid_request")})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	bin, args, err := buildTracerouteCommand(req.Target)
	if err != nil {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey(err.Error())})
	}

	cmd := exec.CommandContext(ctx, bin, args...)
	out, runErr := cmd.CombinedOutput()

	if ctx.Err() == context.DeadlineExceeded {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("timeout")})
	}
	if runErr != nil {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("exec_failed")})
	}

	return c.JSON(models.ApiGenericResponse{
		Result: []models.ApiGenericResultPair{{Server: "local", Data: string(out)}},
	})
}

func handleToolTracerouteStream(c fiber.Ctx) error {
	if !checkRateLimit() {
		return c.Status(429).JSON(fiber.Map{"error": publicErrorFromKey("rate_limit_exceeded")})
	}

	var req models.ToolTargetRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(400).JSON(models.ApiGenericResponse{Error: publicErrorFromKey("invalid_request")})
	}

	bin, args, err := buildTracerouteCommand(req.Target)
	if err != nil {
		return c.Status(400).JSON(models.ApiGenericResponse{Error: publicErrorFromKey(err.Error())})
	}

	// Set SSE headers
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	c.RequestCtx().SetBodyStreamWriter(func(w *bufio.Writer) {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, bin, args...)
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return
		}

		if err := cmd.Start(); err != nil {
			return
		}

		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			msg := scanner.Text()
			fmt.Fprintf(w, "data: %s\n\n", msg)
			w.Flush()
		}

		cmd.Wait()
	})

	return nil
}

func handleToolBird(c fiber.Ctx) error {
	if !checkRateLimit() {
		return c.JSON(fiber.Map{
			"error":     publicErrorFromKey("rate_limit_exceeded"),
			"rateLimit": true,
		})
	}

	var req models.ToolBirdRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("invalid_request")})
	}

	command := strings.TrimSpace(req.Command)

	if !isAllowedCommand(command) {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("command_not_allowed")})
	}

	output, err := queryBird(command)
	if err != nil {
		return c.JSON(models.ApiGenericResponse{Error: publicErrorFromKey("bird_query_failed")})
	}

	return c.JSON(models.ApiGenericResponse{
		Result: []models.ApiGenericResultPair{
			{Server: "local", Data: output},
		},
	})
}

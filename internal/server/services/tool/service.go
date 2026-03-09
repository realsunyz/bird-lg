package tool

import (
	"bird-lg/server/internal/server/domain/model"
	"bird-lg/server/internal/server/domain/validation"
	"bird-lg/server/internal/server/platform/config"
	errx "bird-lg/server/internal/server/platform/errors"
	"bird-lg/server/internal/server/platform/upstream"
	"github.com/gofiber/fiber/v3"
)

type Service struct {
	cfg *config.Config
}

type StreamRequest struct {
	Endpoint     string
	UpstreamPath string
	Payload      any
}

func NewService(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

func (s *Service) Run(serverID, target, upstreamPath string) (model.APIGenericResponse, int, string) {
	normalizedTarget, targetErrorKey := validation.ValidateToolTarget(target)
	if targetErrorKey != "" {
		return model.APIGenericResponse{}, fiber.StatusBadRequest, errx.PublicErrorFromKey(targetErrorKey)
	}

	server := s.cfg.FindServer(serverID)
	if server == nil {
		return model.APIGenericResponse{}, fiber.StatusNotFound, errx.PublicErrorFromKey("server_not_found")
	}

	result, err := upstream.ProxyToClientPath(server.Endpoint, upstreamPath, model.TargetRequest{Target: normalizedTarget}, s.cfg.HMACSecret)
	if err != nil {
		if ferr, ok := err.(*fiber.Error); ok {
			return model.APIGenericResponse{}, fiber.StatusBadGateway, ferr.Message
		}
		return model.APIGenericResponse{}, fiber.StatusBadGateway, errx.FormatPublicError(errx.ErrCodeServerBadStatus, "Upstream client returned an error")
	}
	return result, 0, ""
}

func (s *Service) PrepareStream(serverID, target, upstreamPath string, payloadBuilder func(string) (any, error)) (*StreamRequest, int, string) {
	normalizedTarget, targetErrorKey := validation.ValidateToolTarget(target)
	if targetErrorKey != "" {
		return nil, fiber.StatusBadRequest, errx.PublicErrorFromKey(targetErrorKey)
	}

	server := s.cfg.FindServer(serverID)
	if server == nil {
		return nil, fiber.StatusNotFound, errx.PublicErrorFromKey("server_not_found")
	}

	payload, err := payloadBuilder(normalizedTarget)
	if err != nil {
		return nil, fiber.StatusBadRequest, errx.PublicErrorFromKey("invalid_request")
	}

	return &StreamRequest{
		Endpoint:     server.Endpoint,
		UpstreamPath: upstreamPath,
		Payload:      payload,
	}, 0, ""
}

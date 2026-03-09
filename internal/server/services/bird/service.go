package bird

import (
	"bird-lg/server/internal/server/domain/model"
	"bird-lg/server/internal/server/platform/config"
	errx "bird-lg/server/internal/server/platform/errors"
	"bird-lg/server/internal/server/platform/upstream"
	"github.com/gofiber/fiber/v3"
)

type Service struct {
	cfg *config.Config
}

func NewService(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

func (s *Service) Run(queryType, serverID, command string) (model.APIGenericResponse, int, string) {
	if queryType != "bird" {
		return model.APIGenericResponse{}, fiber.StatusBadRequest, errx.FormatPublicError(errx.ErrCodeReqBadRequest, "Invalid query type for bird endpoint")
	}

	server := s.cfg.FindServer(serverID)
	if server == nil {
		return model.APIGenericResponse{}, fiber.StatusNotFound, errx.PublicErrorFromKey("server_not_found")
	}

	result, err := upstream.ProxyToClientPath(server.Endpoint, "/api/tool/bird", model.BirdCommandRequest{Command: command}, s.cfg.HMACSecret)
	if err != nil {
		if ferr, ok := err.(*fiber.Error); ok {
			return model.APIGenericResponse{}, fiber.StatusBadGateway, ferr.Message
		}
		return model.APIGenericResponse{}, fiber.StatusBadGateway, errx.FormatPublicError(errx.ErrCodeServerBadStatus, "Upstream client returned an error")
	}

	return result, 0, ""
}

package handlers

import (
	"bird-lg/client/internal/buildinfo"
	"bird-lg/client/internal/model"
	"github.com/gofiber/fiber/v3"
)

func (h *Handler) Version(c fiber.Ctx) error {
	info := buildinfo.Current()
	return c.JSON(model.VersionResponse{
		Version: info.Version,
		Build:   info.Build,
	})
}

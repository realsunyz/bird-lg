package admin

import (
	"sync"

	"bird-lg/server/internal/server/domain/model"
	"bird-lg/server/internal/server/platform/config"
	"bird-lg/server/internal/server/platform/upstream"
	"github.com/gofiber/fiber/v3"
)

type Service struct {
	cfg *config.Config
}

func NewService(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

func (s *Service) PopVersions() model.PopVersionsResponse {
	items := make([]model.PopVersionItem, len(s.cfg.Servers))

	var wg sync.WaitGroup
	for i, server := range s.cfg.Servers {
		wg.Add(1)

		go func(index int, endpoint, serverID string) {
			defer wg.Done()

			item := model.PopVersionItem{ServerID: serverID}
			result, err := upstream.FetchClientVersion(endpoint, s.cfg.HMACSecret)
			if err != nil {
				if ferr, ok := err.(*fiber.Error); ok {
					item.Error = ferr.Message
				} else {
					item.Error = err.Error()
				}
				items[index] = item
				return
			}

			item.Version = result.Version
			item.Build = result.Build
			items[index] = item
		}(i, server.Endpoint, server.ID)
	}

	wg.Wait()
	return model.PopVersionsResponse{Pops: items}
}

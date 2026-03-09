package config

import (
	"crypto/sha256"
	"encoding/hex"
	"sync"

	platformconfig "bird-lg/server/internal/server/platform/config"
)

type Service struct {
	cfg *platformconfig.Config

	once    sync.Once
	payload []byte
	etag    string
	err     error
}

func NewService(cfg *platformconfig.Config) *Service {
	return &Service{cfg: cfg}
}

func (s *Service) Payload(encode func(any) ([]byte, error)) ([]byte, string, error) {
	s.once.Do(func() {
		s.payload, s.err = encode(s.cfg.ToClientConfig())
		if s.err != nil {
			return
		}
		sum := sha256.Sum256(s.payload)
		s.etag = `"` + hex.EncodeToString(sum[:]) + `"`
	})

	return s.payload, s.etag, s.err
}

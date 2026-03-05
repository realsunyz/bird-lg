package config

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"bird-lg/server/internal/logx"
	"gopkg.in/yaml.v3"
)

type LocalizedText struct {
	EN string `yaml:"en" json:"en"`
	ZH string `yaml:"zh,omitempty" json:"zh,omitempty"`
}

func (l LocalizedText) Normalize() LocalizedText {
	en := strings.TrimSpace(l.EN)
	zh := strings.TrimSpace(l.ZH)
	if en == "" {
		en = zh
	}
	if zh == "" {
		zh = en
	}
	return LocalizedText{EN: en, ZH: zh}
}

func (l *LocalizedText) UnmarshalYAML(value *yaml.Node) error {
	switch value.Kind {
	case yaml.ScalarNode:
		var raw string
		if err := value.Decode(&raw); err != nil {
			return err
		}
		*l = LocalizedText{EN: strings.TrimSpace(raw)}
		return nil
	case yaml.MappingNode:
		var raw struct {
			EN string `yaml:"en"`
			ZH string `yaml:"zh"`
		}
		if err := value.Decode(&raw); err != nil {
			return err
		}
		*l = LocalizedText{EN: strings.TrimSpace(raw.EN), ZH: strings.TrimSpace(raw.ZH)}
		return nil
	default:
		return value.Decode(&l.EN)
	}
}

type ServerConfig struct {
	ID       string        `yaml:"id" json:"id"`
	Name     LocalizedText `yaml:"name" json:"name"`
	Descr    LocalizedText `yaml:"descr" json:"descr"`
	Location string        `yaml:"location,omitempty" json:"-"`
	Endpoint string        `yaml:"endpoint" json:"endpoint"`
	Icon     string        `yaml:"icon,omitempty" json:"icon,omitempty"`
}

type AppSettings struct {
	Title string `yaml:"title" json:"title"`
}

type TurnstileConfig struct {
	SiteKey   string `yaml:"site_key" json:"siteKey"`
	SecretKey string `yaml:"secret_key" json:"-"`
}

type Config struct {
	Listen    string          `yaml:"listen"`
	StaticDir string          `yaml:"static_dir"`
	HTTPS     bool            `yaml:"https"`
	Turnstile TurnstileConfig `yaml:"turnstile"`
	JWT       struct {
		Secret string `yaml:"secret"`
	} `yaml:"jwt"`
	HMAC struct {
		Secret string `yaml:"secret"`
	} `yaml:"hmac"`
	Logto struct {
		Endpoint string `yaml:"endpoint"`
		AppID    string `yaml:"app_id"`
	} `yaml:"logto"`
	Servers []ServerConfig `yaml:"servers"`
	App     AppSettings    `json:"app" yaml:"app"`

	ListenAddr         string `yaml:"-"`
	TurnstileSiteKey   string `yaml:"-"`
	TurnstileSecretKey string `yaml:"-"`
	JWTSecret          string `yaml:"-"`
	HMACSecret         string `yaml:"-"`
	LogtoEndpoint      string `yaml:"-"`
	LogtoAppID         string `yaml:"-"`
}

func (c *Config) CookieName() string {
	if c.HTTPS {
		return "__Host-token"
	}
	return "token"
}

func LoadConfig() *Config {
	cfg := &Config{
		Listen:    ":3000",
		StaticDir: "./static",
		App:       AppSettings{Title: "Looking Glass"},
	}

	configPath := getEnv("CONFIG_FILE", "config.yaml")
	if data, err := os.ReadFile(configPath); err == nil {
		if err := yaml.Unmarshal(data, cfg); err != nil {
			logx.Warnf("Failed to parse config file %s: %v", configPath, err)
		}
	}

	if v := os.Getenv("LISTEN_ADDR"); v != "" {
		cfg.Listen = v
	}
	if v := os.Getenv("HTTPS"); v != "" {
		cfg.HTTPS = v == "true"
	}
	if v := os.Getenv("TURNSTILE_SITE_KEY"); v != "" {
		cfg.Turnstile.SiteKey = v
	}
	if v := os.Getenv("TURNSTILE_SECRET_KEY"); v != "" {
		cfg.Turnstile.SecretKey = v
	}
	if v := os.Getenv("JWT_SECRET"); v != "" {
		cfg.JWT.Secret = v
	}
	if v := os.Getenv("HMAC_SECRET"); v != "" {
		cfg.HMAC.Secret = v
	}
	if v := os.Getenv("APP_TITLE"); v != "" {
		cfg.App.Title = v
	}
	if v := os.Getenv("SERVERS"); v != "" {
		var servers []ServerConfig
		if err := yaml.Unmarshal([]byte(v), &servers); err == nil {
			cfg.Servers = servers
		}
	}

	cfg.ListenAddr = cfg.Listen
	cfg.TurnstileSiteKey = cfg.Turnstile.SiteKey
	cfg.TurnstileSecretKey = cfg.Turnstile.SecretKey
	cfg.JWTSecret = cfg.JWT.Secret
	cfg.HMACSecret = cfg.HMAC.Secret
	cfg.LogtoEndpoint = cfg.Logto.Endpoint
	cfg.LogtoAppID = cfg.Logto.AppID

	if v := os.Getenv("LOGTO_ENDPOINT"); v != "" {
		cfg.LogtoEndpoint = v
	}
	if v := os.Getenv("LOGTO_APP_ID"); v != "" {
		cfg.LogtoAppID = v
	}

	if strings.TrimSpace(cfg.JWTSecret) == "" {
		logx.Warnf("JWT_SECRET not configured; generating a random secret and persisting it to %s", configPath)
		generated, err := generateRandomSecret()
		if err != nil {
			logx.Warnf("Failed to generate random JWT secret (%v); falling back to insecure development secret", err)
			generated = "devSecret"
		}
		cfg.JWT.Secret = generated
		cfg.JWTSecret = generated
		if err := persistConfig(configPath, cfg); err != nil {
			logx.Warnf("Failed to persist generated JWT secret to %s: %v", configPath, err)
		} else {
			logx.Warnf("Generated JWT secret persisted to %s", configPath)
		}
	}
	if strings.TrimSpace(cfg.TurnstileSecretKey) == "" {
		logx.Warnf("TURNSTILE_SECRET_KEY not configured; tool JWT middleware is bypassed")
	}
	if strings.TrimSpace(cfg.HMACSecret) == "" {
		logx.Warnf("HMAC_SECRET not configured; requests to router nodes will be unsigned")
	}
	if strings.TrimSpace(cfg.StaticDir) == "" {
		cfg.StaticDir = "./static"
	}

	return cfg
}

func (c *Config) FindServer(id string) *ServerConfig {
	for i := range c.Servers {
		if c.Servers[i].ID == id {
			return &c.Servers[i]
		}
	}
	return nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func generateRandomSecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("crypto/rand read failed: %w", err)
	}
	return base64.StdEncoding.EncodeToString(buf), nil
}

func persistConfig(configPath string, cfg *Config) error {
	dir := filepath.Dir(configPath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, 0o600)
}

type ClientServerConfig struct {
	ID    string        `json:"id"`
	Name  LocalizedText `json:"name"`
	Descr LocalizedText `json:"descr"`
	Icon  string        `json:"icon,omitempty"`
}

type ClientConfig struct {
	Turnstile struct {
		SiteKey string `json:"siteKey"`
	} `json:"turnstile"`
	Logto struct {
		Endpoint string `json:"endpoint,omitempty"`
		AppID    string `json:"appId,omitempty"`
	} `json:"logto,omitempty"`
	Servers []ClientServerConfig `json:"servers"`
	App     AppSettings          `json:"app"`
}

func (c *Config) ToClientConfig() ClientConfig {
	cc := ClientConfig{}
	cc.Turnstile.SiteKey = c.TurnstileSiteKey
	cc.Logto.Endpoint = c.LogtoEndpoint
	cc.Logto.AppID = c.LogtoAppID

	cc.Servers = make([]ClientServerConfig, len(c.Servers))
	for i, s := range c.Servers {
		name := s.Name.Normalize()
		descr := s.Descr.Normalize()
		if descr.EN == "" {
			legacy := strings.TrimSpace(s.Location)
			if legacy != "" {
				descr = LocalizedText{EN: legacy, ZH: legacy}
			}
		}
		cc.Servers[i] = ClientServerConfig{ID: s.ID, Name: name, Descr: descr, Icon: s.Icon}
	}

	cc.App = c.App
	return cc
}

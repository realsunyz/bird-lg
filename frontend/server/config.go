package main

import (
	"log"
	"os"
	"strconv"
	"strings"

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
	return LocalizedText{
		EN: en,
		ZH: zh,
	}
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
		*l = LocalizedText{
			EN: strings.TrimSpace(raw.EN),
			ZH: strings.TrimSpace(raw.ZH),
		}
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

	// Computed fields
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
	config := &Config{
		Listen:    ":3000",
		StaticDir: "./static",
		App: AppSettings{
			Title: "Looking Glass",
		},
	}

	// Try loading from config file
	configPath := getEnv("CONFIG_FILE", "config.yaml")
	if data, err := os.ReadFile(configPath); err == nil {
		if err := yaml.Unmarshal(data, config); err != nil {
			log.Printf("Warning: failed to parse config file %s: %v", configPath, err)
		}
	}

	// Override with environment variables
	if v := os.Getenv("LISTEN_ADDR"); v != "" {
		config.Listen = v
	}
	if v := os.Getenv("HTTPS"); v != "" {
		config.HTTPS = v == "true"
	}
	if v := os.Getenv("TURNSTILE_SITE_KEY"); v != "" {
		config.Turnstile.SiteKey = v
	}
	if v := os.Getenv("TURNSTILE_SECRET_KEY"); v != "" {
		config.Turnstile.SecretKey = v
	}
	if v := os.Getenv("JWT_SECRET"); v != "" {
		config.JWT.Secret = v
	}
	if v := os.Getenv("HMAC_SECRET"); v != "" {
		config.HMAC.Secret = v
	}
	if v := os.Getenv("APP_TITLE"); v != "" {
		config.App.Title = v
	}
	if v := os.Getenv("SERVERS"); v != "" {
		var servers []ServerConfig
		if err := yaml.Unmarshal([]byte(v), &servers); err == nil {
			config.Servers = servers
		}
	}

	// Set computed fields
	config.ListenAddr = config.Listen
	config.TurnstileSiteKey = config.Turnstile.SiteKey
	config.TurnstileSecretKey = config.Turnstile.SecretKey
	config.JWTSecret = config.JWT.Secret
	config.HMACSecret = config.HMAC.Secret
	config.LogtoEndpoint = config.Logto.Endpoint
	config.LogtoAppID = config.Logto.AppID

	// Override Logto with env vars
	if v := os.Getenv("LOGTO_ENDPOINT"); v != "" {
		config.LogtoEndpoint = v
	}
	if v := os.Getenv("LOGTO_APP_ID"); v != "" {
		config.LogtoAppID = v
	}

	// Default JWT secret for development
	if config.JWTSecret == "" {
		config.JWTSecret = "devSecret"
	}
	if strings.TrimSpace(config.StaticDir) == "" {
		config.StaticDir = "./static"
	}

	return config
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
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
	Auth    struct {
		IsAuthenticated bool   `json:"isAuthenticated"`
		User            string `json:"user,omitempty"`
		AuthType        string `json:"authType,omitempty"`
	} `json:"auth"`
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
		cc.Servers[i] = ClientServerConfig{
			ID:    s.ID,
			Name:  name,
			Descr: descr,
			Icon:  s.Icon,
		}
	}

	cc.App = c.App
	return cc
}

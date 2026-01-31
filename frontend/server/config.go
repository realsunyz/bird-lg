package main

import (
	"log"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type ServerConfig struct {
	ID       string `yaml:"id" json:"id"`
	Name     string `yaml:"name" json:"name"`
	Location string `yaml:"location" json:"location"`
	Endpoint string `yaml:"endpoint" json:"endpoint"`
	Icon     string `yaml:"icon,omitempty" json:"icon,omitempty"`
}

type AppSettings struct {
	Title    string `yaml:"title" json:"title"`
	Subtitle string `yaml:"subtitle" json:"subtitle"`
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
	Servers []ServerConfig `yaml:"servers"`
	App     AppSettings    `yaml:"app"`

	// Computed fields
	ListenAddr         string `yaml:"-"`
	TurnstileSiteKey   string `yaml:"-"`
	TurnstileSecretKey string `yaml:"-"`
	JWTSecret          string `yaml:"-"`
	HMACSecret         string `yaml:"-"`
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
			Title:    "BIRD Looking Glass",
			Subtitle: "Select a server to continue",
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
	if v := os.Getenv("STATIC_DIR"); v != "" {
		config.StaticDir = v
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
	if v := os.Getenv("APP_SUBTITLE"); v != "" {
		config.App.Subtitle = v
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

	// Default JWT secret for development
	if config.JWTSecret == "" {
		config.JWTSecret = "devSecret"
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

type ClientConfig struct {
	Turnstile struct {
		SiteKey string `json:"siteKey"`
	} `json:"turnstile"`
	Servers []ServerConfig `json:"servers"`
	App     AppSettings    `json:"app"`
}

func (c *Config) ToClientConfig() ClientConfig {
	cc := ClientConfig{}
	cc.Turnstile.SiteKey = c.TurnstileSiteKey
	cc.Servers = c.Servers
	cc.App = c.App
	return cc
}

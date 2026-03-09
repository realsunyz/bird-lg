package platform

import "flag"

type Config struct {
	ListenAddr     string
	BirdSocket     string
	HMACSecret     string
	AllowedOrigins string
	RateLimitMS    int
}

func ParseConfig() Config {
	cfg := Config{}
	flag.StringVar(&cfg.ListenAddr, "listen", ":8000", "Listen address")
	flag.StringVar(&cfg.BirdSocket, "bird", "/run/bird/bird.ctl", "BIRD socket path")
	flag.StringVar(&cfg.HMACSecret, "secret", "", "HMAC shared secret for signature verification")
	flag.StringVar(&cfg.AllowedOrigins, "origins", "*", "Allowed CORS origins (comma-separated)")
	flag.IntVar(&cfg.RateLimitMS, "ratelimit", 1000, "Rate limit interval in milliseconds (0 to disable)")
	flag.Parse()
	return cfg
}

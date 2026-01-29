package main

import (
	"flag"
	"log"
	"net/http"
)

var (
	listenAddr     string
	birdSocket     string
	hmacSecret     string
	allowedOrigins string
)

func init() {
	flag.StringVar(&listenAddr, "listen", ":8000", "Listen address")
	flag.StringVar(&birdSocket, "bird", "/run/bird/bird.ctl", "BIRD socket path")
	flag.StringVar(&hmacSecret, "secret", "", "HMAC shared secret for signature verification")
	flag.StringVar(&allowedOrigins, "origins", "*", "Allowed CORS origins (comma-separated)")
}

func main() {
	flag.Parse()

	// Set HMAC shared secret if provided
	if hmacSecret != "" {
		setSharedSecret(hmacSecret)
		log.Printf("HMAC signature verification enabled")
	} else {
		log.Printf("WARNING: HMAC secret not configured - API is unprotected!")
	}

	// Setup HTTP routes
	mux := http.NewServeMux()
	mux.HandleFunc("/api/query", corsMiddleware(authMiddleware(handleQuery)))
	mux.HandleFunc("/api/health", corsMiddleware(handleHealth))

	log.Printf("Starting BIRD Looking Glass Client on %s", listenAddr)
	log.Printf("BIRD socket: %s", birdSocket)

	if err := http.ListenAndServe(listenAddr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

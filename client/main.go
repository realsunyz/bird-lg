package main

import (
	"flag"
	"log"
	"net/http"
)

var (
	listenAddr     string
	birdSocket     string
	publicKeyFile  string
	allowedOrigins string
)

func init() {
	flag.StringVar(&listenAddr, "listen", ":8000", "Listen address")
	flag.StringVar(&birdSocket, "bird", "/run/bird/bird.ctl", "BIRD socket path")
	flag.StringVar(&publicKeyFile, "pubkey", "", "ECDSA public key file for signature verification")
	flag.StringVar(&allowedOrigins, "origins", "*", "Allowed CORS origins (comma-separated)")
}

func main() {
	flag.Parse()

	// Load ECDSA public key if provided
	if publicKeyFile != "" {
		if err := loadPublicKey(publicKeyFile); err != nil {
			log.Fatalf("Failed to load public key: %v", err)
		}
		log.Printf("ECDSA signature verification enabled")
	} else {
		log.Printf("WARNING: ECDSA signature verification disabled - API is unprotected!")
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

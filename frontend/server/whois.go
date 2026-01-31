package main

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"time"

	re2 "github.com/wasilibs/go-re2"

	"github.com/gofiber/fiber/v3"
)

type WhoisRequest struct {
	Query string `json:"query"`
}

type WhoisResponse struct {
	Bogon     bool              `json:"bogon,omitempty"`
	ReasonKey string            `json:"reasonKey,omitempty"`
	Params    map[string]string `json:"params,omitempty"`
	IANA      string            `json:"iana,omitempty"`
	RIR       string            `json:"rir,omitempty"`
	RIRServer string            `json:"rirServer,omitempty"`
	Error     string            `json:"error,omitempty"`
}

var referRegex = re2.MustCompile(`(?im)^(?:refer|whois):\s+(.+)$`)

func handleWhois() fiber.Handler {
	return func(c fiber.Ctx) error {
		var req WhoisRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		if req.Query == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Query required"})
		}

		// Check bogon
		bogon := CheckBogon(req.Query)
		if bogon.IsBogon {
			return c.JSON(WhoisResponse{
				Bogon:     true,
				ReasonKey: bogon.ReasonKey,
				Params:    bogon.Params,
			})
		}

		// Query IANA
		ianaResult, err := queryWhois("whois.iana.org", req.Query)
		if err != nil {
			return c.JSON(WhoisResponse{
				IANA:  fmt.Sprintf("Error querying IANA: %v", err),
				Error: err.Error(),
			})
		}

		// Check for referral
		var rirResult, rirServer string
		if match := referRegex.FindStringSubmatch(ianaResult); match != nil {
			rirServer = strings.TrimSpace(match[1])
			rirResult, _ = queryWhois(rirServer, req.Query)
		}

		return c.JSON(WhoisResponse{
			IANA:      ianaResult,
			RIR:       rirResult,
			RIRServer: rirServer,
		})
	}
}

func queryWhois(server, query string) (string, error) {
	conn, err := net.DialTimeout("tcp", server+":43", 10*time.Second)
	if err != nil {
		return "", err
	}
	defer conn.Close()

	conn.SetDeadline(time.Now().Add(10 * time.Second))

	fmt.Fprintf(conn, "%s\r\n", query)

	var result strings.Builder
	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		result.WriteString(scanner.Text())
		result.WriteString("\n")
	}

	if err := scanner.Err(); err != nil {
		return result.String(), err
	}

	return result.String(), nil
}

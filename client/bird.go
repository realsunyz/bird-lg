package main

import (
	"bufio"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

// SummaryRowData represents a single protocol entry
type SummaryRowData struct {
	Name  string `json:"name"`
	Proto string `json:"proto"`
	Table string `json:"table"`
	State string `json:"state"`
	Since string `json:"since"`
	Info  string `json:"info"`
}

// queryBird sends a command to BIRD and returns the response
func queryBird(command string) (string, error) {
	conn, err := net.DialTimeout("unix", birdSocket, 5*time.Second)
	if err != nil {
		return "", fmt.Errorf("failed to connect to BIRD socket: %w", err)
	}
	defer conn.Close()

	// Set timeout
	conn.SetDeadline(time.Now().Add(30 * time.Second))

	reader := bufio.NewReader(conn)

	// Read welcome message
	_, err = readBirdResponse(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read welcome message: %w", err)
	}

	// Send restrict command first to prevent modifications
	_, err = conn.Write([]byte("restrict\n"))
	if err != nil {
		return "", fmt.Errorf("failed to send restrict command: %w", err)
	}

	// Read restrict response
	_, err = readBirdResponse(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read restrict response: %w", err)
	}

	// Send actual command
	_, err = conn.Write([]byte(command + "\n"))
	if err != nil {
		return "", fmt.Errorf("failed to send command: %w", err)
	}

	// Read response
	response, err := readBirdResponse(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	return response, nil
}

// readBirdResponse reads a complete response from BIRD
// BIRD responses end with a line starting with a 4-digit code followed by a space
func readBirdResponse(reader *bufio.Reader) (string, error) {
	var result strings.Builder
	endPattern := regexp.MustCompile(`^\d{4} `)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return result.String(), err
		}

		// Remove the status code prefix from continuation lines
		if len(line) > 5 && line[4] == '-' {
			line = line[5:]
		} else if endPattern.MatchString(line) {
			// Final line - extract message after code
			if len(line) > 5 {
				result.WriteString(line[5:])
			}
			break
		}

		result.WriteString(line)
	}

	return result.String(), nil
}

// parseSummary parses the output of "show protocols" command
func parseSummary(output string) []SummaryRowData {
	var result []SummaryRowData
	lines := strings.Split(output, "\n")

	// Skip header line
	headerSkipped := false
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Skip header
		if !headerSkipped && strings.HasPrefix(line, "Name") {
			headerSkipped = true
			continue
		}

		// Parse protocol line
		// Format: Name       Proto      Table      State  Since         Info
		fields := strings.Fields(line)
		if len(fields) >= 5 {
			row := SummaryRowData{
				Name:  fields[0],
				Proto: fields[1],
				Table: fields[2],
				State: fields[3],
				Since: fields[4],
			}
			if len(fields) > 5 {
				row.Info = strings.Join(fields[5:], " ")
			}
			result = append(result, row)
		}
	}

	return result
}

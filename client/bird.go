package main

import (
	"bufio"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

type SummaryRowData struct {
	Name  string `json:"name"`
	Proto string `json:"proto"`
	Table string `json:"table"`
	State string `json:"state"`
	Since string `json:"since"`
	Info  string `json:"info"`
}

func queryBird(command string) (string, error) {
	conn, err := net.DialTimeout("unix", birdSocket, 5*time.Second)
	if err != nil {
		return "", fmt.Errorf("bird_connection_failed")
	}
	defer conn.Close()

	conn.SetDeadline(time.Now().Add(30 * time.Second))

	reader := bufio.NewReader(conn)

	_, err = readBirdResponse(reader)
	if err != nil {
		return "", fmt.Errorf("bird_welcome_failed")
	}

	_, err = conn.Write([]byte("restrict\n"))
	if err != nil {
		return "", fmt.Errorf("bird_restrict_failed")
	}

	_, err = readBirdResponse(reader)
	if err != nil {
		return "", fmt.Errorf("bird_restrict_failed")
	}

	_, err = conn.Write([]byte(command + "\n"))
	if err != nil {
		return "", fmt.Errorf("bird_command_failed")
	}

	response, err := readBirdResponse(reader)
	if err != nil {
		return "", fmt.Errorf("bird_response_failed")
	}

	return response, nil
}

func readBirdResponse(reader *bufio.Reader) (string, error) {
	var result strings.Builder
	endPattern := regexp.MustCompile(`^\d{4} `)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return result.String(), err
		}

		if len(line) > 5 && line[4] == '-' {
			line = line[5:]
		} else if endPattern.MatchString(line) {
			if len(line) > 5 {
				result.WriteString(line[5:])
			}
			break
		}

		result.WriteString(line)
	}

	return result.String(), nil
}

func parseSummary(output string) []SummaryRowData {
	var result []SummaryRowData
	lines := strings.Split(output, "\n")

	headerSkipped := false
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if !headerSkipped && strings.HasPrefix(line, "Name") {
			headerSkipped = true
			continue
		}

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

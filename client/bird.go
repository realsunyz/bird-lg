package main

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"time"
)

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
	isEndLine := func(line string) bool {
		if len(line) < 5 {
			return false
		}
		for i := 0; i < 4; i++ {
			c := line[i]
			if c < '0' || c > '9' {
				return false
			}
		}
		return line[4] == ' '
	}

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return result.String(), err
		}

		if len(line) > 5 && line[4] == '-' {
			line = line[5:]
		} else if isEndLine(line) {
			if len(line) > 5 {
				result.WriteString(line[5:])
			}
			break
		}

		result.WriteString(line)
	}

	return result.String(), nil
}

package bird

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"time"
)

func Query(socketPath, command string, timeout time.Duration) (string, error) {
	conn, err := net.DialTimeout("unix", socketPath, 5*time.Second)
	if err != nil {
		if isTimeoutError(err) {
			return "", fmt.Errorf("timeout")
		}
		return "", fmt.Errorf("bird_connection_failed")
	}
	defer conn.Close()

	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	conn.SetDeadline(time.Now().Add(timeout))

	reader := bufio.NewReader(conn)

	if _, err = readResponse(reader); err != nil {
		if isTimeoutError(err) {
			return "", fmt.Errorf("timeout")
		}
		return "", fmt.Errorf("bird_welcome_failed")
	}

	if _, err = conn.Write([]byte("restrict\n")); err != nil {
		if isTimeoutError(err) {
			return "", fmt.Errorf("timeout")
		}
		return "", fmt.Errorf("bird_restrict_failed")
	}
	if _, err = readResponse(reader); err != nil {
		if isTimeoutError(err) {
			return "", fmt.Errorf("timeout")
		}
		return "", fmt.Errorf("bird_restrict_failed")
	}

	if _, err = conn.Write([]byte(command + "\n")); err != nil {
		if isTimeoutError(err) {
			return "", fmt.Errorf("timeout")
		}
		return "", fmt.Errorf("bird_command_failed")
	}

	response, err := readResponse(reader)
	if err != nil {
		if isTimeoutError(err) {
			return "", fmt.Errorf("timeout")
		}
		return "", fmt.Errorf("bird_response_failed")
	}
	return response, nil
}

func isTimeoutError(err error) bool {
	netErr, ok := err.(net.Error)
	return ok && netErr.Timeout()
}

func readResponse(reader *bufio.Reader) (string, error) {
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

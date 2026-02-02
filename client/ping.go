package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

var (
	pingBin   string
	pingFlags []string
)

func init() {
	detectPing()
}

func detectPing() {
	// Try finding ping binary
	path, err := exec.LookPath("ping")
	if err == nil {
		pingBin = path
		pingFlags = []string{"-c", "4", "-i", "0.2"} // Default: 4 packets, 0.2s interval for speed
	}
}

func runPing(target string) (string, error) {
	if pingBin == "" {
		return "", fmt.Errorf("ping_not_found")
	}

	target = strings.TrimSpace(target)
	if target == "" {
		return "", fmt.Errorf("empty_target")
	}

	if strings.ContainsAny(target, ";&|`$(){}[]<>\\'\"\\n\\r\\t") {
		return "", fmt.Errorf("invalid_target")
	}

	args := append(pingFlags, target)
	cmd := exec.Command(pingBin, args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		// Ping usually returns non-zero if packets are lost, but we still want the output
		if stdout.Len() > 0 {
			return stdout.String(), nil
		}
		return "", fmt.Errorf("ping_exec_failed")
	}

	return stdout.String(), nil
}

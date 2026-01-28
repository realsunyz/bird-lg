package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

var (
	tracerouteBin   string
	tracerouteFlags []string
)

func init() {
	// Auto-detect traceroute binary and flags
	detectTraceroute()
}

func detectTraceroute() {
	// Try different traceroute configurations
	configs := []struct {
		bin   string
		flags []string
	}{
		{"mtr", []string{"-w", "-c1", "-Z1", "-G1", "-b"}},
		{"traceroute", []string{"-q1", "-N32", "-w1"}}, // Linux
		{"traceroute", []string{"-q1", "-w1"}},         // FreeBSD
		{"traceroute", nil},                            // Busybox
	}

	for _, cfg := range configs {
		path, err := exec.LookPath(cfg.bin)
		if err != nil {
			continue
		}

		// Test with 127.0.0.1
		args := append(cfg.flags, "127.0.0.1")
		cmd := exec.Command(path, args...)
		if err := cmd.Run(); err == nil {
			tracerouteBin = path
			tracerouteFlags = cfg.flags
			return
		}
	}

	// Fallback
	tracerouteBin = "traceroute"
	tracerouteFlags = nil
}

// runTraceroute executes traceroute to the given target
func runTraceroute(target string) (string, error) {
	if tracerouteBin == "" {
		return "", fmt.Errorf("traceroute binary not found")
	}

	// Validate target (basic security check)
	target = strings.TrimSpace(target)
	if target == "" {
		return "", fmt.Errorf("empty target")
	}

	// Prevent command injection
	if strings.ContainsAny(target, ";&|`$(){}[]<>\\'\"\n\r\t") {
		return "", fmt.Errorf("invalid target")
	}

	args := append(tracerouteFlags, target)
	cmd := exec.Command(tracerouteBin, args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		// Traceroute may return non-zero even on partial success
		if stdout.Len() > 0 {
			return stdout.String(), nil
		}
		return "", fmt.Errorf("traceroute failed: %s", stderr.String())
	}

	return stdout.String(), nil
}

// runWhois executes whois query
func runWhois(target string) (string, error) {
	// Validate target
	target = strings.TrimSpace(target)
	if target == "" {
		return "", fmt.Errorf("empty target")
	}

	// Prevent command injection
	if strings.ContainsAny(target, ";&|`$(){}[]<>\\'\"\n\r\t") {
		return "", fmt.Errorf("invalid target")
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		return "", fmt.Errorf("whois not supported on Windows")
	}

	cmd = exec.Command("whois", target)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("whois failed: %s", stderr.String())
	}

	return stdout.String(), nil
}

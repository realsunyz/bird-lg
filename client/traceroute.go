package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

var (
	tracerouteBin   string
	tracerouteFlags []string
)

func init() {
	detectTraceroute()
}

func detectTraceroute() {
	configs := []struct {
		bin   string
		flags []string
	}{
		{"mtr", []string{"-w", "-c1", "-Z1", "-G1", "-b"}},
		{"traceroute", []string{"-q1", "-N32", "-w1"}},
		{"traceroute", []string{"-q1", "-w1"}},
		{"traceroute", nil},
	}

	for _, cfg := range configs {
		path, err := exec.LookPath(cfg.bin)
		if err != nil {
			continue
		}

		args := append(cfg.flags, "127.0.0.1")
		cmd := exec.Command(path, args...)
		if err := cmd.Run(); err == nil {
			tracerouteBin = path
			tracerouteFlags = cfg.flags
			return
		}
	}

	tracerouteBin = "traceroute"
	tracerouteFlags = nil
}

func runTraceroute(target string) (string, error) {
	if tracerouteBin == "" {
		return "", fmt.Errorf("traceroute_not_found")
	}

	target = strings.TrimSpace(target)
	if target == "" {
		return "", fmt.Errorf("empty_target")
	}

	if strings.ContainsAny(target, ";&|`$(){}[]<>\\'\"\\n\\r\\t") {
		return "", fmt.Errorf("invalid_target")
	}

	args := append(tracerouteFlags, target)
	cmd := exec.Command(tracerouteBin, args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		if stdout.Len() > 0 {
			return stdout.String(), nil
		}
		return "", fmt.Errorf("traceroute_exec_failed")
	}

	return stdout.String(), nil
}

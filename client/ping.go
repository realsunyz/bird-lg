package main

import (
	"fmt"
	"os/exec"
	"strings"
)

var (
	pingBin string
)

func init() {
	detectPing()
}

func detectPing() {
	path, err := exec.LookPath("ping")
	if err == nil {
		pingBin = path
	}
}

func buildPingCommand(target string, count int) (bin string, args []string, err error) {
	if pingBin == "" {
		return "", nil, fmt.Errorf("ping_not_found")
	}

	target = strings.TrimSpace(target)
	if target == "" {
		return "", nil, fmt.Errorf("empty_target")
	}

	if strings.ContainsAny(target, ";&|`$(){}[]<>\\'\"\\n\\r\\t") {
		return "", nil, fmt.Errorf("invalid_target")
	}

	if count <= 0 {
		count = 4
	}
	if count > 20 {
		count = 20
	}

	args = []string{"-c", fmt.Sprintf("%d", count), "-i", "0.2"}
	args = append(args, target)
	return pingBin, args, nil
}

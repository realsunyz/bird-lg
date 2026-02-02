package main

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

var (
	mtrBin   string
	mtrFlags []string
)

func init() {
	detectMtr()
}

func detectMtr() {
	path, err := exec.LookPath("mtr")
	if err == nil {
		mtrBin = path
		// Report mode, 4 cycles, no dns resolution (faster)
		mtrFlags = []string{"--report", "--report-cycles=4", "--no-dns"}
	}
}

func runMtr(target string) (string, error) {
	if mtrBin == "" {
		return "", fmt.Errorf("mtr_not_found")
	}

	target = strings.TrimSpace(target)
	if target == "" {
		return "", fmt.Errorf("empty_target")
	}

	if strings.ContainsAny(target, ";&|`$(){}[]<>\\'\"\\n\\r\\t") {
		return "", fmt.Errorf("invalid_target")
	}

	args := append(mtrFlags, target)
	cmd := exec.Command(mtrBin, args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		if stdout.Len() > 0 {
			return stdout.String(), nil
		}
		return "", fmt.Errorf("mtr_exec_failed")
	}

	return stdout.String(), nil
}

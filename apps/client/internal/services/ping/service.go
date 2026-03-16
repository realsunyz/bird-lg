package ping

import (
	"fmt"
	"os/exec"
	"strings"
)

var pingBin string
var pingSupportsOutstanding bool

func init() {
	if path, err := exec.LookPath("ping"); err == nil {
		pingBin = path
		pingSupportsOutstanding = supportsOutstandingReport(path)
	}
}

func supportsOutstandingReport(path string) bool {
	out, _ := exec.Command(path, "-h").CombinedOutput()
	if len(out) == 0 {
		out, _ = exec.Command(path, "--help").CombinedOutput()
	}
	return strings.Contains(string(out), "-O")
}

func BuildCommand(target string, count int) (string, []string, error) {
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

	args := []string{"-c", fmt.Sprintf("%d", count), "-i", "0.5", target}
	if pingSupportsOutstanding {
		args = []string{"-O", "-c", fmt.Sprintf("%d", count), "-i", "0.5", target}
	}
	return pingBin, args, nil
}

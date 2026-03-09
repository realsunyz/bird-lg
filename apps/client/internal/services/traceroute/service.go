package traceroute

import (
	"fmt"
	"os/exec"
	"strings"
)

var (
	tracerouteBin   string
	tracerouteFlags []string
)

func init() {
	configs := []struct {
		bin   string
		flags []string
	}{
		{"traceroute", []string{"-q1", "-N32", "-w1"}},
		{"traceroute", []string{"-q1", "-w1"}},
		{"mtr", []string{"-w", "-c1", "-Z1", "-G1", "-b"}},
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
}

func BuildCommand(target string) (string, []string, error) {
	target = strings.TrimSpace(target)
	if target == "" {
		return "", nil, fmt.Errorf("empty_target")
	}
	if strings.ContainsAny(target, ";&|`$(){}[]<>\\'\"\\n\\r\\t") {
		return "", nil, fmt.Errorf("invalid_target")
	}

	args := append(append([]string(nil), tracerouteFlags...), target)
	return tracerouteBin, args, nil
}

package buildinfo

import (
	"runtime/debug"
	"strings"
)

var (
	Version = "dev"
	Build   = ""
)

type Info struct {
	Version string `json:"version"`
	Build   string `json:"build"`
}

func Current() Info {
	return Info{
		Version: normalizeVersion(Version),
		Build:   normalizeBuild(Build),
	}
}

func normalizeVersion(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "dev"
	}
	return value
}

func normalizeBuild(value string) string {
	if short := shortCommit(value); short != "" {
		return short
	}

	if info, ok := debug.ReadBuildInfo(); ok {
		for _, setting := range info.Settings {
			if setting.Key == "vcs.revision" {
				if short := shortCommit(setting.Value); short != "" {
					return short
				}
			}
		}
	}

	return "unknown"
}

func shortCommit(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) > 7 {
		value = value[:7]
	}
	return strings.ToLower(value)
}

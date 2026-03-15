package model

import "bird-lg-client/internal/buildinfo"

type ApiGenericResultPair struct {
	Server string `json:"server"`
	Data   string `json:"data"`
}

type ApiGenericResponse struct {
	Error     string                 `json:"error,omitempty"`
	Result    []ApiGenericResultPair `json:"result,omitempty"`
	RateLimit bool                   `json:"rateLimit,omitempty"`
	Version   string                 `json:"version"`
	Build     string                 `json:"build"`
}

type ToolTargetRequest struct {
	Target string `json:"target"`
	Count  int    `json:"count,omitempty"`
}

type ToolBirdRequest struct {
	Command string `json:"command"`
}

type VersionResponse struct {
	Version string `json:"version"`
	Build   string `json:"build"`
}

func WithBuildInfo(resp ApiGenericResponse) ApiGenericResponse {
	info := buildinfo.Current()
	resp.Version = info.Version
	resp.Build = info.Build
	return resp
}

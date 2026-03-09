package model

type ApiGenericResultPair struct {
	Server string `json:"server"`
	Data   string `json:"data"`
}

type ApiGenericResponse struct {
	Error     string                 `json:"error,omitempty"`
	Result    []ApiGenericResultPair `json:"result,omitempty"`
	RateLimit bool                   `json:"rateLimit,omitempty"`
}

type ToolTargetRequest struct {
	Target string `json:"target"`
	Count  int    `json:"count,omitempty"`
}

type ToolBirdRequest struct {
	Command string `json:"command"`
}

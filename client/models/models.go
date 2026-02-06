package models

//go:generate easyjson -all models.go

//easyjson:json
type ApiGenericResultPair struct {
	Server string `json:"server"`
	Data   string `json:"data"`
}

//easyjson:json
type ApiGenericResponse struct {
	Error  string                 `json:"error,omitempty"`
	Result []ApiGenericResultPair `json:"result,omitempty"`
}

//easyjson:json
type ToolTargetRequest struct {
	Target string `json:"target"`
	Count  int    `json:"count,omitempty"`
}

//easyjson:json
type ToolBirdRequest struct {
	Command string `json:"command"`
}

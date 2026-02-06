package models

//go:generate easyjson -all models.go

//easyjson:json
type QueryRequest struct {
	Type    string `json:"type"`
	Server  string `json:"server"`
	Command string `json:"command,omitempty"`
}

//easyjson:json
type ProtocolSummaryRow struct {
	Name  string `json:"name"`
	Proto string `json:"proto"`
	Table string `json:"table"`
	State string `json:"state"`
	Since string `json:"since"`
	Info  string `json:"info"`
}

//easyjson:json
type ToolRunRequest struct {
	Server string `json:"server"`
	Target string `json:"target"`
}

//easyjson:json
type BogonResult struct {
	IsBogon   bool              `json:"isBogon"`
	ReasonKey string            `json:"reasonKey,omitempty"`
	Params    map[string]string `json:"params,omitempty"`
}

//easyjson:json
type LogtoTokenResponse struct {
	AccessToken  string `json:"access_token"`
	IDToken      string `json:"id_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

//easyjson:json
type LogtoUserInfo struct {
	Sub      string `json:"sub"`
	Username string `json:"username,omitempty"`
	Name     string `json:"name,omitempty"`
	Email    string `json:"email,omitempty"`
}

//easyjson:json
type TargetRequest struct {
	Target string `json:"target"`
}

//easyjson:json
type PingStreamRequest struct {
	Target string `json:"target"`
	Count  int    `json:"count"`
}

//easyjson:json
type BirdCommandRequest struct {
	Command string `json:"command"`
}

//easyjson:json
type GenericResponse map[string]interface{}

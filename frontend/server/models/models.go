package models

type QueryRequest struct {
	Type    string `json:"type"`
	Server  string `json:"server"`
	Command string `json:"command,omitempty"`
}

type ProtocolSummaryRow struct {
	Name  string `json:"name"`
	Proto string `json:"proto"`
	Table string `json:"table"`
	State string `json:"state"`
	Since string `json:"since"`
	Info  string `json:"info"`
}

type ToolRunRequest struct {
	Server string `json:"server"`
	Target string `json:"target"`
}

type BogonResult struct {
	IsBogon   bool              `json:"isBogon"`
	ReasonKey string            `json:"reasonKey,omitempty"`
	Params    map[string]string `json:"params,omitempty"`
}

type LogtoTokenResponse struct {
	AccessToken  string `json:"access_token"`
	IDToken      string `json:"id_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type LogtoUserInfo struct {
	Sub      string `json:"sub"`
	Username string `json:"username,omitempty"`
	Name     string `json:"name,omitempty"`
	Email    string `json:"email,omitempty"`
}

type TargetRequest struct {
	Target string `json:"target"`
}

type PingStreamRequest struct {
	Target string `json:"target"`
	Count  int    `json:"count"`
}

type BirdCommandRequest struct {
	Command string `json:"command"`
}

type ApiGenericResultPair struct {
	Server string `json:"server"`
	Data   string `json:"data"`
}

type ApiGenericResponse struct {
	Error     string                 `json:"error,omitempty"`
	Result    []ApiGenericResultPair `json:"result,omitempty"`
	RateLimit bool                   `json:"rateLimit,omitempty"`
}

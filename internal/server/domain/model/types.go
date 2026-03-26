package model

type QueryRequest struct {
	Type    string `json:"type"`
	Server  string `json:"server"`
	Command string `json:"command,omitempty"`
}

type ToolRunRequest struct {
	Server string `json:"server"`
	Target string `json:"target"`
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

type TraceIPInfoLookupRequest struct {
	IPs []string `json:"ips"`
}

type TraceIPMetadata struct {
	IP          string `json:"ip"`
	ASN         string `json:"asn,omitempty"`
	ASName      string `json:"asName,omitempty"`
	Country     string `json:"country,omitempty"`
	CountryCode string `json:"countryCode,omitempty"`
}

type TraceIPInfoResponse struct {
	Items map[string]TraceIPMetadata `json:"items"`
}

type BirdCommandRequest struct {
	Command string `json:"command"`
}

type APIGenericResultPair struct {
	Server string `json:"server"`
	Data   string `json:"data"`
}

type APIGenericResponse struct {
	Error     string                 `json:"error,omitempty"`
	Result    []APIGenericResultPair `json:"result,omitempty"`
	RateLimit bool                   `json:"rateLimit,omitempty"`
	Version   string                 `json:"version"`
	Build     string                 `json:"build"`
}

type ClientVersionResponse struct {
	Version string `json:"version"`
	Build   string `json:"build"`
}

type PopVersionItem struct {
	ServerID string `json:"serverId"`
	Version  string `json:"version,omitempty"`
	Build    string `json:"build,omitempty"`
	Error    string `json:"error,omitempty"`
}

type PopVersionsResponse struct {
	Pops []PopVersionItem `json:"pops"`
}

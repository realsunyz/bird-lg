package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type ApiRequest struct {
	Servers []string `json:"servers"`
	Type    string   `json:"type"`
	Args    string   `json:"args"`
}

// ApiGenericResultPair represents a generic result
type ApiGenericResultPair struct {
	Server string `json:"server"`
	Data   string `json:"data"`
}

// ApiSummaryResultPair represents a summary result
type ApiSummaryResultPair struct {
	Server string           `json:"server"`
	Data   []SummaryRowData `json:"data"`
}

// ApiGenericResponse is the response for bird/traceroute/whois queries
type ApiGenericResponse struct {
	Error  string                 `json:"error"`
	Result []ApiGenericResultPair `json:"result"`
}

// ApiSummaryResponse is the response for summary queries
type ApiSummaryResponse struct {
	Error  string                 `json:"error"`
	Result []ApiSummaryResultPair `json:"result"`
}

// handleQuery handles the unified API endpoint
func handleQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req ApiRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"invalid request: %s"}`, err.Error()), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	switch req.Type {
	case "summary":
		handleSummary(w, req)
	case "bird":
		handleBird(w, req)
	case "traceroute":
		handleTraceroute(w, req)
	case "whois":
		handleWhois(w, req)
	case "server_list":
		handleServerList(w, req)
	default:
		http.Error(w, `{"error":"unknown query type"}`, http.StatusBadRequest)
	}
}

func handleSummary(w http.ResponseWriter, req ApiRequest) {
	output, err := queryBird("show protocols")
	if err != nil {
		json.NewEncoder(w).Encode(ApiSummaryResponse{
			Error: err.Error(),
		})
		return
	}

	summary := parseSummary(output)
	json.NewEncoder(w).Encode(ApiSummaryResponse{
		Result: []ApiSummaryResultPair{
			{Server: "local", Data: summary},
		},
	})
}

func handleBird(w http.ResponseWriter, req ApiRequest) {
	// Validate command - only allow safe read-only commands
	if !isAllowedCommand(req.Args) {
		json.NewEncoder(w).Encode(ApiGenericResponse{
			Error: "command not allowed",
		})
		return
	}

	output, err := queryBird(req.Args)
	if err != nil {
		json.NewEncoder(w).Encode(ApiGenericResponse{
			Error: err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(ApiGenericResponse{
		Result: []ApiGenericResultPair{
			{Server: "local", Data: output},
		},
	})
}

func handleTraceroute(w http.ResponseWriter, req ApiRequest) {
	output, err := runTraceroute(req.Args)
	if err != nil {
		json.NewEncoder(w).Encode(ApiGenericResponse{
			Error: err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(ApiGenericResponse{
		Result: []ApiGenericResultPair{
			{Server: "local", Data: output},
		},
	})
}

func handleWhois(w http.ResponseWriter, req ApiRequest) {
	output, err := runWhois(req.Args)
	if err != nil {
		json.NewEncoder(w).Encode(ApiGenericResponse{
			Error: err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(ApiGenericResponse{
		Result: []ApiGenericResultPair{
			{Server: "", Data: output},
		},
	})
}

func handleServerList(w http.ResponseWriter, req ApiRequest) {
	// This client is a single server, return itself
	json.NewEncoder(w).Encode(ApiGenericResponse{
		Result: []ApiGenericResultPair{
			{Server: "local", Data: ""},
		},
	})
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

// isAllowedCommand checks if a BIRD command is safe to execute
func isAllowedCommand(cmd string) bool {
	// List of allowed command prefixes
	allowed := []string{
		"show route",
		"show protocols",
		"show protocol",
		"show status",
		"show memory",
		"show interfaces",
		"show ospf",
		"show bfd",
		"show roa",
		"show static",
		"show symbols",
	}

	for _, prefix := range allowed {
		if len(cmd) >= len(prefix) && cmd[:len(prefix)] == prefix {
			return true
		}
	}

	return false
}

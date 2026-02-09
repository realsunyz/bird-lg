package main

import "strings"

const (
	errCodeReqBadRequest        = "ERR-REQ-400"
	errCodeTargetEmpty          = "ERR-TARGET-400-EMPTY"
	errCodeTargetInvalid        = "ERR-TARGET-400-INVALID"
	errCodeAuthMissingSignature = "ERR-AUTH-401-MISSING_SIG"
	errCodeAuthInvalidTimestamp = "ERR-AUTH-401-BAD_TS"
	errCodeAuthTimestampExpired = "ERR-AUTH-401-TS_EXPIRED"
	errCodeAuthSignatureInvalid = "ERR-AUTH-401-SIG_INVALID"
	errCodeAuthFailed           = "ERR-AUTH-401"
	errCodeCmdForbidden         = "ERR-CMD-403"
	errCodeRateLimit            = "ERR-RATE-429"
	errCodePingUnavailable      = "ERR-PING-500"
	errCodeToolExecFailed       = "ERR-TOOL-500-EXEC"
	errCodeToolTimeout          = "ERR-TOOL-504"
	errCodeBirdQueryFailed      = "ERR-BIRD-502"
)

func formatPublicError(code, explanation string) string {
	code = strings.TrimSpace(code)
	explanation = strings.TrimSpace(explanation)
	if explanation == "" {
		explanation = "Error"
	}

	needsExplanationPunct := !strings.HasSuffix(explanation, ".") &&
		!strings.HasSuffix(explanation, "!") &&
		!strings.HasSuffix(explanation, "?") &&
		!strings.HasSuffix(explanation, "。") &&
		!strings.HasSuffix(explanation, "！") &&
		!strings.HasSuffix(explanation, "？")
	if needsExplanationPunct {
		explanation += "."
	}

	if code == "" {
		return explanation
	}
	return explanation + " (" + code + ")."
}

func publicErrorFromKey(key string) string {
	switch strings.TrimSpace(key) {
	case "invalid_request":
		return formatPublicError(errCodeReqBadRequest, "Invalid request")
	case "empty_target":
		return formatPublicError(errCodeTargetEmpty, "Target is required")
	case "invalid_target":
		return formatPublicError(errCodeTargetInvalid, "Invalid target")
	case "ping_not_found":
		return formatPublicError(errCodePingUnavailable, "Ping tool is not available on this server")
	case "timeout":
		return formatPublicError(errCodeToolTimeout, "Command timed out")
	case "exec_failed":
		return formatPublicError(errCodeToolExecFailed, "Command execution failed")
	case "command_not_allowed":
		return formatPublicError(errCodeCmdForbidden, "This command is not allowed. Please contact the NOC for more information")
	case "bird_query_failed":
		return formatPublicError(errCodeBirdQueryFailed, "Failed to query BIRD")
	case "rate_limit_exceeded":
		return formatPublicError(errCodeRateLimit, "Rate limit exceeded. Please try again later")
	default:
		return formatPublicError(errCodeToolExecFailed, "Command execution failed")
	}
}

package platform

import "strings"

const (
	ErrCodeReqBadRequest        = "ERR-REQ-400"
	ErrCodeTargetEmpty          = "ERR-TARGET-400-EMPTY"
	ErrCodeTargetInvalid        = "ERR-TARGET-400-FORMAT"
	ErrCodeAuthMissingSignature = "ERR-AUTH-401-MISSING_SIG"
	ErrCodeAuthInvalidTimestamp = "ERR-AUTH-401-BAD_TS"
	ErrCodeAuthTimestampExpired = "ERR-AUTH-401-TS_EXPIRED"
	ErrCodeAuthSignatureInvalid = "ERR-AUTH-401-SIG_INVALID"
	ErrCodeAuthFailed           = "ERR-AUTH-401"
	ErrCodeCmdForbidden         = "ERR-CMD-403"
	ErrCodeRateLimit            = "ERR-RATE-429"
	ErrCodePingUnavailable      = "ERR-PING-500"
	ErrCodeToolExecFailed       = "ERR-TOOL-500-EXEC"
	ErrCodeToolTimeout          = "ERR-TOOL-504"
	ErrCodeBirdQueryFailed      = "ERR-BIRD-502"
)

func FormatPublicError(code, _ string) string {
	code = strings.TrimSpace(code)
	if code == "" {
		return ErrCodeToolExecFailed
	}
	return code
}

func PublicErrorFromKey(key string) string {
	switch strings.TrimSpace(key) {
	case "invalid_request":
		return FormatPublicError(ErrCodeReqBadRequest, "Invalid request")
	case "empty_target":
		return FormatPublicError(ErrCodeTargetEmpty, "Target is required")
	case "invalid_target":
		return FormatPublicError(ErrCodeTargetInvalid, "Invalid target")
	case "ping_not_found":
		return FormatPublicError(ErrCodePingUnavailable, "Ping tool is not available on this server")
	case "timeout":
		return FormatPublicError(ErrCodeToolTimeout, "Command timed out")
	case "exec_failed":
		return FormatPublicError(ErrCodeToolExecFailed, "Command execution failed")
	case "command_not_allowed":
		return FormatPublicError(ErrCodeCmdForbidden, "This command is not allowed. Please contact the NOC for more information")
	case "bird_query_failed":
		return FormatPublicError(ErrCodeBirdQueryFailed, "Failed to query BIRD")
	case "rate_limit_exceeded":
		return FormatPublicError(ErrCodeRateLimit, "Rate limit exceeded. Please try again later")
	default:
		return FormatPublicError(ErrCodeToolExecFailed, "Command execution failed")
	}
}

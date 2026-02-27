package errors

import "strings"

const (
	ErrCodeReqBadRequest           = "ERR-REQ-400"
	ErrCodeReqTimeout              = "ERR-REQ-408"
	ErrCodeTargetRequired          = "ERR-TARGET-400-EMPTY"
	ErrCodeTargetInvalidFormat     = "ERR-TARGET-400-FORMAT"
	ErrCodeTargetBogonBlocked      = "ERR-TARGET-400-BOGON"
	ErrCodeAuthUnauthorized        = "ERR-AUTH-401"
	ErrCodeAuthSSORequired         = "ERR-AUTH-403-SSO_REQUIRED"
	ErrCodeServerNotFound          = "ERR-SERVER-404"
	ErrCodeUpstreamConnectFailed   = "ERR-UPSTREAM-502-CONNECT"
	ErrCodeUpstreamBadStatus       = "ERR-UPSTREAM-502-STATUS"
	ErrCodeSSONotConfigured        = "ERR-SSO-404"
	ErrCodeSSOMissingCode          = "ERR-SSO-400-MISSING_CODE"
	ErrCodeSSOMissingCodeVerifier  = "ERR-SSO-400-MISSING_VERIFIER"
	ErrCodeSSOTokenExchangeFailed  = "ERR-SSO-401-TOKEN_EXCHANGE"
	ErrCodeSSOVerifierGenFailed    = "ERR-SSO-500-VERIFIER_GEN"
	ErrCodeCaptchaUnavailable      = "ERR-CAPTCHA-503"
	ErrCodeCaptchaVerificationFail = "ERR-CAPTCHA-403"
)

func FormatPublicError(code, _ string) string {
	code = strings.TrimSpace(code)
	if code == "" {
		return ErrCodeReqBadRequest
	}
	return code
}

func PublicErrorFromKey(key string) string {
	switch strings.TrimSpace(key) {
	case "invalid_request":
		return FormatPublicError(ErrCodeReqBadRequest, "Invalid request")
	case "target_required":
		return FormatPublicError(ErrCodeTargetRequired, "Target is required")
	case "target_invalid_format":
		return FormatPublicError(ErrCodeTargetInvalidFormat, "Target must be a valid IPv4, IPv6, or domain name")
	case "target_bogon_blocked":
		return FormatPublicError(ErrCodeTargetBogonBlocked, "Bogon, private, or reserved targets are not allowed")
	case "unauthorized":
		return FormatPublicError(ErrCodeAuthUnauthorized, "Authentication required")
	case "server_not_found":
		return FormatPublicError(ErrCodeServerNotFound, "Server not found")
	default:
		return FormatPublicError(ErrCodeReqBadRequest, "Invalid request")
	}
}

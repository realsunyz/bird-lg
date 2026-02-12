package main

import "strings"

const (
	errCodeReqBadRequest           = "ERR-REQ-400"
	errCodeTargetRequired          = "ERR-TARGET-400-EMPTY"
	errCodeTargetInvalidFormat     = "ERR-TARGET-400-FORMAT"
	errCodeTargetBogonBlocked      = "ERR-TARGET-400-BOGON"
	errCodeAuthUnauthorized        = "ERR-AUTH-401"
	errCodeAuthSSORequired         = "ERR-AUTH-403-SSO_REQUIRED"
	errCodeServerNotFound          = "ERR-SERVER-404"
	errCodeUpstreamConnectFailed   = "ERR-UPSTREAM-502-CONNECT"
	errCodeUpstreamBadStatus       = "ERR-UPSTREAM-502-STATUS"
	errCodeSSONotConfigured        = "ERR-SSO-404"
	errCodeSSOMissingCode          = "ERR-SSO-400-MISSING_CODE"
	errCodeSSOMissingCodeVerifier  = "ERR-SSO-400-MISSING_VERIFIER"
	errCodeSSOTokenExchangeFailed  = "ERR-SSO-401-TOKEN_EXCHANGE"
	errCodeSSOVerifierGenFailed    = "ERR-SSO-500-VERIFIER_GEN"
	errCodeCaptchaUnavailable      = "ERR-CAPTCHA-503"
	errCodeCaptchaVerificationFail = "ERR-CAPTCHA-403"
)

func formatPublicError(code, _ string) string {
	code = strings.TrimSpace(code)
	if code == "" {
		return errCodeReqBadRequest
	}
	return code
}

func publicErrorFromKey(key string) string {
	switch strings.TrimSpace(key) {
	case "invalid_request":
		return formatPublicError(errCodeReqBadRequest, "Invalid request")
	case "target_required":
		return formatPublicError(errCodeTargetRequired, "Target is required")
	case "target_invalid_format":
		return formatPublicError(errCodeTargetInvalidFormat, "Target must be a valid IPv4, IPv6, or domain name")
	case "target_bogon_blocked":
		return formatPublicError(errCodeTargetBogonBlocked, "Bogon, private, or reserved targets are not allowed")
	case "unauthorized":
		return formatPublicError(errCodeAuthUnauthorized, "Authentication required")
	case "server_not_found":
		return formatPublicError(errCodeServerNotFound, "Server not found")
	default:
		return formatPublicError(errCodeReqBadRequest, "Invalid request")
	}
}

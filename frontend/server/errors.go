package main

import "strings"

const (
	errCodeReqBadRequest           = "ERR-REQ-400"
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
	case "unauthorized":
		return formatPublicError(errCodeAuthUnauthorized, "Authentication required")
	case "server_not_found":
		return formatPublicError(errCodeServerNotFound, "Server not found")
	default:
		return formatPublicError(errCodeReqBadRequest, "Invalid request")
	}
}

package main

import (
	"bird-lg/server/models"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/client"
)

// OAuth callback from Logto
func handleLogtoCallback(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if config.LogtoEndpoint == "" || config.LogtoAppID == "" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": formatPublicError(errCodeSSONotConfigured, "SSO is not configured")})
		}

		// Check for error from Logto
		if errStr := c.Query("error"); errStr != "" {
			desc := c.Query("error_description")
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":                      formatPublicError(errCodeReqBadRequest, "SSO provider returned an error"),
				"provider_error":             errStr,
				"provider_error_description": desc,
			})
		}

		code := c.Query("code")
		if code == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": formatPublicError(errCodeSSOMissingCode, "Missing OAuth code")})
		}

		// Get code verifier from cookie
		verifier := c.Cookies("logto_code_verifier")
		if verifier == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": formatPublicError(errCodeSSOMissingCodeVerifier, "Missing PKCE code verifier")})
		}

		// Clear verifier cookie
		c.ClearCookie("logto_code_verifier")

		// Exchange code for tokens
		tokenResp, err := exchangeLogtoCode(config, code, verifier, c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": formatPublicError(errCodeSSOTokenExchangeFailed, "Token exchange failed")})
		}

		// Get user info
		userInfo, err := getLogtoUserInfo(config, tokenResp.AccessToken)
		if err != nil {
			// Even if userinfo fails, we can still issue token
			userInfo = &models.LogtoUserInfo{Sub: "unknown"}
		}

		// Issue JWT with Logto auth type
		token := GenerateJWTWithSub(config.JWTSecret, AuthTypeLogto, userInfo.Sub)
		cookie := &fiber.Cookie{
			Name:     config.CookieName(),
			Value:    token,
			Path:     "/",
			MaxAge:   int(ExpiryLogto.Seconds()),
			HTTPOnly: true,
			SameSite: "Strict",
			Secure:   config.HTTPS,
		}
		c.Cookie(cookie)

		// Redirect to saved location or home
		redirect := c.Query("redirect", "/")
		return c.Redirect().To(redirect)
	}
}

func exchangeLogtoCode(config *Config, code, verifier string, c fiber.Ctx) (*models.LogtoTokenResponse, error) {
	cc := client.New()
	cc.SetTimeout(10 * time.Second)

	tokenURL := config.LogtoEndpoint + "/oidc/token"

	req := cc.R()
	req.SetFormData("grant_type", "authorization_code")
	req.SetFormData("code", code)
	req.SetFormData("code_verifier", verifier)
	req.SetFormData("client_id", config.LogtoAppID)
	req.SetFormData("redirect_uri", getRedirectURI(c))

	resp, err := req.Post(tokenURL)
	if err != nil {
		return nil, err
	}

	var tokenResp models.LogtoTokenResponse
	if err := tokenResp.UnmarshalJSON(resp.Body()); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func getLogtoUserInfo(config *Config, accessToken string) (*models.LogtoUserInfo, error) {
	cc := client.New()
	cc.SetTimeout(10 * time.Second)

	userinfoURL := config.LogtoEndpoint + "/oidc/me"

	req := cc.R()
	req.SetHeader("Authorization", "Bearer "+accessToken)

	resp, err := req.Get(userinfoURL)
	if err != nil {
		return nil, err
	}

	var userInfo models.LogtoUserInfo
	if err := userInfo.UnmarshalJSON(resp.Body()); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

func getRedirectURI(c fiber.Ctx) string {
	scheme := "http"
	if c.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	return scheme + "://" + c.Host() + "/api/callback"
}

// Logto OAuth flow
func handleLogtoLogin(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if config.LogtoEndpoint == "" || config.LogtoAppID == "" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": formatPublicError(errCodeSSONotConfigured, "SSO is not configured")})
		}

		redirect := c.Query("redirect", "/")
		redirectURI := getRedirectURI(c)

		// PKCE: Generate verifier and challenge
		verifier, err := generateCodeVerifier()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": formatPublicError(errCodeSSOVerifierGenFailed, "Failed to generate PKCE verifier")})
		}
		challenge := generateCodeChallenge(verifier)

		// Store verifier in cookie
		c.Cookie(&fiber.Cookie{
			Name:     "logto_code_verifier",
			Value:    verifier,
			Path:     "/",
			MaxAge:   300, // 5 minutes
			HTTPOnly: true,
			SameSite: "Lax", // Needs to be Lax to be sent on redirect from external site
			Secure:   config.HTTPS,
		})

		authURL := config.LogtoEndpoint + "/oidc/auth" +
			"?client_id=" + config.LogtoAppID +
			"&redirect_uri=" + redirectURI +
			"&response_type=code" +
			"&scope=openid%20profile%20email" +
			"&code_challenge=" + challenge +
			"&code_challenge_method=S256" +
			"&state=" + redirect

		return c.Redirect().To(authURL)
	}
}

// Clear auth cookie and redirect
func handleLogtoLogout(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Explicitly overwrite cookie with past expiry and matching attributes
		cookie := &fiber.Cookie{
			Name:     config.CookieName(),
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			Expires:  time.Now().Add(-1 * time.Hour),
			HTTPOnly: true,
			SameSite: "Strict",
			Secure:   config.HTTPS,
		}
		c.Cookie(cookie)
		return c.Redirect().To("/")
	}
}

// PKCE Helper Functions

func generateCodeVerifier() (string, error) {
	// Random bytes
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	// Base64 URL encode
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func generateCodeChallenge(verifier string) string {
	// SHA256 hash
	h := sha256.Sum256([]byte(verifier))
	// Base64 URL encode
	return base64.RawURLEncoding.EncodeToString(h[:])
}

package main

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/client"
)

// LogtoTokenResponse from OIDC token endpoint
type LogtoTokenResponse struct {
	AccessToken  string `json:"access_token"`
	IDToken      string `json:"id_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// LogtoUserInfo from userinfo endpoint
type LogtoUserInfo struct {
	Sub      string `json:"sub"`
	Username string `json:"username,omitempty"`
	Name     string `json:"name,omitempty"`
	Email    string `json:"email,omitempty"`
}

// handleLogtoCallback handles the OAuth callback from Logto
func handleLogtoCallback(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if config.LogtoEndpoint == "" || config.LogtoAppID == "" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "logto_not_configured"})
		}

		code := c.Query("code")
		if code == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_code"})
		}

		// Exchange code for tokens
		tokenResp, err := exchangeLogtoCode(config, code, c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "token_exchange_failed"})
		}

		// Get user info
		userInfo, err := getLogtoUserInfo(config, tokenResp.AccessToken)
		if err != nil {
			// Even if userinfo fails, we can still issue token
			userInfo = &LogtoUserInfo{Sub: "unknown"}
		}

		// Issue our own JWT with Logto auth type
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

func exchangeLogtoCode(config *Config, code string, c fiber.Ctx) (*LogtoTokenResponse, error) {
	cc := client.New()
	cc.SetTimeout(10 * time.Second)

	tokenURL := config.LogtoEndpoint + "/oidc/token"

	req := cc.R()
	req.SetFormData("grant_type", "authorization_code")
	req.SetFormData("code", code)
	req.SetFormData("client_id", config.LogtoAppID)
	req.SetFormData("redirect_uri", getRedirectURI(c))

	resp, err := req.Post(tokenURL)
	if err != nil {
		return nil, err
	}

	var tokenResp LogtoTokenResponse
	if err := json.Unmarshal(resp.Body(), &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func getLogtoUserInfo(config *Config, accessToken string) (*LogtoUserInfo, error) {
	cc := client.New()
	cc.SetTimeout(10 * time.Second)

	userinfoURL := config.LogtoEndpoint + "/oidc/me"

	req := cc.R()
	req.SetHeader("Authorization", "Bearer "+accessToken)

	resp, err := req.Get(userinfoURL)
	if err != nil {
		return nil, err
	}

	var userInfo LogtoUserInfo
	if err := json.Unmarshal(resp.Body(), &userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

func getRedirectURI(c fiber.Ctx) string {
	scheme := "http"
	if c.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	return scheme + "://" + c.Hostname() + "/callback"
}

// handleLogtoLogin initiates Logto OAuth flow
func handleLogtoLogin(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if config.LogtoEndpoint == "" || config.LogtoAppID == "" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "logto_not_configured"})
		}

		redirect := c.Query("redirect", "/")
		authURL := config.LogtoEndpoint + "/oidc/auth" +
			"?client_id=" + config.LogtoAppID +
			"&redirect_uri=" + getRedirectURI(c) +
			"&response_type=code" +
			"&scope=openid%20profile%20email" +
			"&state=" + redirect

		return c.Redirect().To(authURL)
	}
}

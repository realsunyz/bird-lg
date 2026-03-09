package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"net/url"
	"strings"
	"time"

	"bird-lg/server/internal/server/domain/model"
	"bird-lg/server/internal/server/platform/config"
	errx "bird-lg/server/internal/server/platform/errors"
	apiclient "bird-lg/server/internal/server/platform/upstream"
	"github.com/gofiber/fiber/v3"
)

func trimTrailingSlash(s string) string {
	return strings.TrimRight(strings.TrimSpace(s), "/")
}

func sanitizeRedirectPath(p string) string {
	p = strings.TrimSpace(p)
	if p == "" {
		return "/"
	}
	if !strings.HasPrefix(p, "/") || strings.HasPrefix(p, "//") {
		return "/"
	}
	return p
}

func encodeRedirectState(redirect string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(redirect))
}

func decodeRedirectState(state string) string {
	if state == "" {
		return "/"
	}
	b, err := base64.RawURLEncoding.DecodeString(state)
	if err != nil {
		return "/"
	}
	return string(b)
}

func HandleLogtoCallback(cfg *config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if cfg.LogtoEndpoint == "" || cfg.LogtoAppID == "" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeSSONotConfigured, "SSO is not configured")})
		}

		if errStr := c.Query("error"); errStr != "" {
			desc := c.Query("error_description")
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":                      errx.FormatPublicError(errx.ErrCodeReqBadRequest, "SSO provider returned an error"),
				"provider_error":             errStr,
				"provider_error_description": desc,
			})
		}

		code := c.Query("code")
		if code == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeSSOMissingCode, "Missing OAuth code")})
		}

		verifier := c.Cookies("logto_code_verifier")
		if verifier == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeSSOMissingCodeVerifier, "Missing PKCE code verifier")})
		}
		c.ClearCookie("logto_code_verifier")

		tokenResp, err := exchangeLogtoCode(cfg, code, verifier, c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeSSOTokenExchangeFailed, "Token exchange failed")})
		}

		userInfo, err := getLogtoUserInfo(cfg, tokenResp.AccessToken)
		if err != nil {
			userInfo = &model.LogtoUserInfo{Sub: "unknown"}
		}

		token := GenerateJWTWithSub(cfg.JWTSecret, AuthTypeLogto, userInfo.Sub)
		c.Cookie(&fiber.Cookie{
			Name:     cfg.CookieName(),
			Value:    token,
			Path:     "/",
			MaxAge:   int(ExpiryLogto.Seconds()),
			HTTPOnly: true,
			SameSite: "Strict",
			Secure:   cfg.HTTPS,
		})

		redirect := sanitizeRedirectPath(decodeRedirectState(c.Query("state")))
		return c.Redirect().To(redirect)
	}
}

func exchangeLogtoCode(cfg *config.Config, code, verifier string, c fiber.Ctx) (*model.LogtoTokenResponse, error) {
	cc := apiclient.NewHTTPClient()

	tokenURL := trimTrailingSlash(cfg.LogtoEndpoint) + "/oidc/token"
	req := cc.R()
	req.SetTimeout(10 * time.Second)
	req.SetFormData("grant_type", "authorization_code")
	req.SetFormData("code", code)
	req.SetFormData("code_verifier", verifier)
	req.SetFormData("client_id", cfg.LogtoAppID)
	req.SetFormData("redirect_uri", getRedirectURI(c))

	resp, err := req.Post(tokenURL)
	if err != nil {
		return nil, err
	}

	var tokenResp model.LogtoTokenResponse
	if err := resp.JSON(&tokenResp); err != nil {
		return nil, err
	}
	return &tokenResp, nil
}

func getLogtoUserInfo(cfg *config.Config, accessToken string) (*model.LogtoUserInfo, error) {
	cc := apiclient.NewHTTPClient()

	userinfoURL := trimTrailingSlash(cfg.LogtoEndpoint) + "/oidc/me"
	req := cc.R()
	req.SetTimeout(10 * time.Second)
	req.SetHeader("Authorization", "Bearer "+accessToken)
	resp, err := req.Get(userinfoURL)
	if err != nil {
		return nil, err
	}

	var userInfo model.LogtoUserInfo
	if err := resp.JSON(&userInfo); err != nil {
		return nil, err
	}
	return &userInfo, nil
}

func getRedirectURI(c fiber.Ctx) string {
	scheme := "http"
	if c.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	return scheme + "://" + c.Host() + "/auth/callback"
}

func HandleLogtoLogin(cfg *config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		if cfg.LogtoEndpoint == "" || cfg.LogtoAppID == "" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeSSONotConfigured, "SSO is not configured")})
		}

		redirect := sanitizeRedirectPath(c.Query("redirect", "/"))
		redirectURI := getRedirectURI(c)

		verifier, err := generateCodeVerifier()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": errx.FormatPublicError(errx.ErrCodeSSOVerifierGenFailed, "Failed to generate PKCE verifier")})
		}
		challenge := generateCodeChallenge(verifier)

		c.Cookie(&fiber.Cookie{
			Name:     "logto_code_verifier",
			Value:    verifier,
			Path:     "/",
			MaxAge:   300,
			HTTPOnly: true,
			SameSite: "Lax",
			Secure:   cfg.HTTPS,
		})

		q := url.Values{}
		q.Set("client_id", cfg.LogtoAppID)
		q.Set("redirect_uri", redirectURI)
		q.Set("response_type", "code")
		q.Set("scope", "openid profile email")
		q.Set("code_challenge", challenge)
		q.Set("code_challenge_method", "S256")
		q.Set("state", encodeRedirectState(redirect))

		authURL := trimTrailingSlash(cfg.LogtoEndpoint) + "/oidc/auth?" + q.Encode()
		return c.Redirect().To(authURL)
	}
}

func HandleLogtoLogout(cfg *config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		c.Cookie(&fiber.Cookie{
			Name:     cfg.CookieName(),
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			Expires:  time.Now().Add(-1 * time.Hour),
			HTTPOnly: true,
			SameSite: "Strict",
			Secure:   cfg.HTTPS,
		})
		return c.Redirect().To("/")
	}
}

func generateCodeVerifier() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func generateCodeChallenge(verifier string) string {
	h := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h[:])
}

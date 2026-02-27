package captcha

import (
	"time"

	apiclient "bird-lg/server/api/client"
	"bird-lg/server/internal/auth"
	"bird-lg/server/internal/config"
	errx "bird-lg/server/internal/errors"
	"github.com/gofiber/fiber/v3"
)

type VerifyRequest struct {
	Token string `json:"token"`
}

type TurnstileResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes,omitempty"`
}

func HandleVerify(cfg *config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		var req VerifyRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}

		if cfg.TurnstileSecretKey == "" {
			SetJWTCookie(c, cfg)
			return c.JSON(fiber.Map{"success": true})
		}

		success, errMsg := verifyTurnstile(cfg.TurnstileSecretKey, req.Token, c.Get("X-Forwarded-For"))
		if !success {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": errMsg})
		}

		SetJWTCookie(c, cfg)
		return c.JSON(fiber.Map{"success": true})
	}
}

func verifyTurnstile(secretKey, token, remoteIP string) (bool, string) {
	cc := apiclient.NewHTTPClient()
	cc.SetTimeout(5 * time.Second)

	req := cc.R()
	req.SetFormData("secret", secretKey)
	req.SetFormData("response", token)
	if remoteIP != "" {
		req.SetFormData("remoteip", remoteIP)
	}

	resp, err := req.Post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
	if err != nil {
		return false, errx.FormatPublicError(errx.ErrCodeCaptchaUnavailable, "The CAPTCHA service is currently unavailable. Please try again later or contact the NOC for more information")
	}

	var result TurnstileResponse
	if err := resp.JSON(&result); err != nil {
		return false, errx.FormatPublicError(errx.ErrCodeCaptchaUnavailable, "The CAPTCHA service is currently unavailable. Please try again later or contact the NOC for more information")
	}
	if !result.Success {
		return false, errx.FormatPublicError(errx.ErrCodeCaptchaVerificationFail, "CAPTCHA verification failed")
	}

	return true, ""
}

func SetJWTCookie(c fiber.Ctx, cfg *config.Config) {
	token := auth.GenerateJWT(cfg.JWTSecret)
	c.Cookie(&fiber.Cookie{
		Name:     cfg.CookieName(),
		Value:    token,
		Path:     "/",
		MaxAge:   300,
		HTTPOnly: true,
		SameSite: "Strict",
		Secure:   cfg.HTTPS,
	})
}

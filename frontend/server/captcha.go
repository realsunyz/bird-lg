package main

import (
	"time"

	"github.com/gofiber/fiber/v3"
)

type VerifyRequest struct {
	Token string `json:"token"`
}

type TurnstileResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes,omitempty"`
}

func handleVerify(config *Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		var req VerifyRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": publicErrorFromKey("invalid_request")})
		}

		// Skip CAPTCHA if no key configured
		if config.TurnstileSecretKey == "" {
			setJWTCookie(c, config)
			return c.JSON(fiber.Map{"success": true})
		}

		// Verify with Cloudflare
		success, errMsg := verifyTurnstile(config.TurnstileSecretKey, req.Token, c.Get("X-Forwarded-For"))
		if !success {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": errMsg})
		}

		// Issue JWT cookie
		setJWTCookie(c, config)
		return c.JSON(fiber.Map{"success": true})
	}
}

func verifyTurnstile(secretKey, token, remoteIP string) (bool, string) {
	cc := newHTTPClient()
	cc.SetTimeout(5 * time.Second)

	req := cc.R()
	req.SetFormData("secret", secretKey)
	req.SetFormData("response", token)
	if remoteIP != "" {
		req.SetFormData("remoteip", remoteIP)
	}

	resp, err := req.Post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
	if err != nil {
		return false, formatPublicError(errCodeCaptchaUnavailable, "The CAPTCHA service is currently unavailable. Please try again later or contact the NOC for more information")
	}

	var result TurnstileResponse
	if err := resp.JSON(&result); err != nil {
		return false, formatPublicError(errCodeCaptchaUnavailable, "The CAPTCHA service is currently unavailable. Please try again later or contact the NOC for more information")
	}

	if !result.Success {
		return false, formatPublicError(errCodeCaptchaVerificationFail, "CAPTCHA verification failed")
	}

	return true, ""
}

func setJWTCookie(c fiber.Ctx, config *Config) {
	token := GenerateJWT(config.JWTSecret)
	cookie := &fiber.Cookie{
		Name:     config.CookieName(),
		Value:    token,
		Path:     "/",
		MaxAge:   300, // 5 minutes
		HTTPOnly: true,
		SameSite: "Strict",
		Secure:   config.HTTPS,
	}
	c.Cookie(cookie)
}

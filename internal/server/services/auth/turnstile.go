package auth

import (
	"strings"
	"time"

	"bird-lg/server/internal/server/platform/config"
	errx "bird-lg/server/internal/server/platform/errors"
	apiclient "bird-lg/server/internal/server/platform/upstream"

	"github.com/gofiber/fiber/v3"
)

type VerifyRequest struct {
	Token string `json:"token"`
}

type TurnstileResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes,omitempty"`
}

type turnstileFailure struct {
	status int
	public string
}

func HandleVerify(cfg *config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		var req VerifyRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": errx.PublicErrorFromKey("invalid_request")})
		}
		if strings.TrimSpace(req.Token) == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": errx.FormatPublicError(errx.ErrCodeCaptchaMissingToken, "CAPTCHA token is required"),
			})
		}

		if cfg.TurnstileSecretKey == "" {
			SetJWTCookie(c, cfg)
			return c.JSON(fiber.Map{"success": true})
		}

		success, failure := verifyTurnstile(cfg.TurnstileSecretKey, req.Token, c.Get("X-Forwarded-For"))
		if !success {
			return c.Status(failure.status).JSON(fiber.Map{"error": failure.public})
		}

		SetJWTCookie(c, cfg)
		return c.JSON(fiber.Map{"success": true})
	}
}

func verifyTurnstile(secretKey, token, remoteIP string) (bool, turnstileFailure) {
	cc := apiclient.NewHTTPClient()

	req := cc.R()
	req.SetTimeout(5 * time.Second)
	req.SetFormData("secret", secretKey)
	req.SetFormData("response", token)
	if remoteIP != "" {
		req.SetFormData("remoteip", remoteIP)
	}

	resp, err := req.Post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
	if err != nil {
		return false, turnstileFailure{
			status: fiber.StatusServiceUnavailable,
			public: errx.FormatPublicError(errx.ErrCodeCaptchaUnavailable, "The CAPTCHA service is currently unavailable. Please try again later or contact the NOC"),
		}
	}

	var result TurnstileResponse
	if err := resp.JSON(&result); err != nil {
		return false, turnstileFailure{
			status: fiber.StatusServiceUnavailable,
			public: errx.FormatPublicError(errx.ErrCodeCaptchaUnavailable, "The CAPTCHA service is currently unavailable. Please try again later or contact the NOC"),
		}
	}
	if !result.Success {
		return false, classifyTurnstileError(result.ErrorCodes)
	}

	return true, turnstileFailure{}
}

func classifyTurnstileError(errorCodes []string) turnstileFailure {
	for _, rawCode := range errorCodes {
		code := strings.TrimSpace(strings.ToLower(rawCode))
		switch code {
		case "missing-input-secret", "invalid-input-secret":
			return turnstileFailure{
				status: fiber.StatusInternalServerError,
				public: errx.FormatPublicError(errx.ErrCodeCaptchaMisconfigured, "CAPTCHA is misconfigured"),
			}
		case "missing-input-response":
			return turnstileFailure{
				status: fiber.StatusBadRequest,
				public: errx.FormatPublicError(errx.ErrCodeCaptchaMissingToken, "CAPTCHA token is required"),
			}
		case "invalid-input-response":
			return turnstileFailure{
				status: fiber.StatusUnprocessableEntity,
				public: errx.FormatPublicError(errx.ErrCodeCaptchaInvalidToken, "CAPTCHA token is invalid"),
			}
		case "timeout-or-duplicate":
			return turnstileFailure{
				status: fiber.StatusConflict,
				public: errx.FormatPublicError(errx.ErrCodeCaptchaTokenSpent, "CAPTCHA token was already used or expired"),
			}
		case "bad-request":
			return turnstileFailure{
				status: fiber.StatusBadRequest,
				public: errx.FormatPublicError(errx.ErrCodeCaptchaVerificationFail, "CAPTCHA verification request was invalid"),
			}
		case "internal-error":
			return turnstileFailure{
				status: fiber.StatusServiceUnavailable,
				public: errx.FormatPublicError(errx.ErrCodeCaptchaUnavailable, "The CAPTCHA service is currently unavailable. Please try again later or contact the NOC"),
			}
		}
	}

	return turnstileFailure{
		status: fiber.StatusForbidden,
		public: errx.FormatPublicError(errx.ErrCodeCaptchaVerificationFail, "CAPTCHA verification failed"),
	}
}

func SetJWTCookie(c fiber.Ctx, cfg *config.Config) {
	token := GenerateJWT(cfg.JWTSecret)
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

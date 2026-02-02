import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n-provider";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>,
      ) => string;
    };
    onTurnstileLoad?: () => void;
  }
}

export default function CaptchaPage() {
  const [searchParams] = useSearchParams();
  const redirect =
    searchParams.get("redirect") ||
    sessionStorage.getItem("auth_redirect") ||
    "/";
  const { t } = useTranslation();

  const [siteKey, setSiteKey] = useState("");
  const [error, setError] = useState("");
  const [hasLogtoConfig, setHasLogtoConfig] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setSiteKey(data.turnstile?.siteKey || "");
        if (data.logto?.endpoint && data.logto?.appId) {
          setHasLogtoConfig(true);
        }
      })
      .catch(() => setError("Failed to load config"));
  }, []);

  useEffect(() => {
    if (!siteKey) return;

    const initTurnstile = () => {
      const container = document.getElementById("turnstile-container");
      if (container && window.turnstile) {
        window.turnstile.render(container, {
          sitekey: siteKey,
          callback: async (token: string) => {
            try {
              const res = await fetch("/api/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              const data = await res.json();
              if (data.success) {
                window.location.href = redirect;
              } else {
                setError(data.error || "Verification failed");
              }
            } catch {
              setError("Verification failed");
            }
          },
          "error-callback": () => {
            setError("Verification failed");
          },
        });
      }
    };

    if (window.turnstile) initTurnstile();
    else window.onTurnstileLoad = initTurnstile;
  }, [siteKey, redirect]);

  const handleSSOLogin = () => {
    sessionStorage.setItem("auth_redirect", redirect);
    // Redirect to backend auth endpoint which handles Logto OAuth
    window.location.href = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <>
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
        async
        defer
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="font-title">
              {t.detail.captcha_title}
            </CardTitle>
            <CardDescription>
              {t.detail.please_complete_captcha}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {error && <p className="text-destructive text-sm">{error}</p>}

            <div id="turnstile-container" className="min-h-[65px]" />

            {hasLogtoConfig && (
              <>
                <div className="flex items-center gap-2 w-full my-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSSOLogin}
                  className="w-full"
                >
                  Sign in with SSO
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

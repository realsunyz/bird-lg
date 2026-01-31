"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get("redirect") || "/";
  const { t } = useTranslation();

  const [siteKey, setSiteKey] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setSiteKey(data.turnstile?.siteKey || "");
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
            setVerifying(true);
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
            } finally {
              setVerifying(false);
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
  }, [siteKey, redirect, router]);

  return (
    <>
      <Script
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
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              {t.detail.please_complete_captcha}
            </p>
            {error && <p className="text-destructive text-sm mb-4">{error}</p>}

            <div id="turnstile-container" className="min-h-[65px]" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  Turnstile,
  type TurnstileLangCode,
} from "@marsidev/react-turnstile";
import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useTranslation } from "@/shared/i18n/provider";
import { buildPostJSONHeaders } from "@/shared/lib/csrf";
import { getToolErrorMessage, isAbortError } from "@/shared/api/tool-client";

function mapTurnstileClientError(errorCode?: string): string {
  const code = (errorCode ?? "").trim();

  if (
    code === "110100" ||
    code === "110110" ||
    code === "400020" ||
    code === "400070"
  ) {
    return "captcha_misconfigured";
  }

  if (code === "110200") return "captcha_domain_not_allowed";
  if (code === "110600" || code === "110620") return "captcha_timeout";
  if (code === "200100") return "captcha_clock_or_cache_issue";
  if (code === "200500") return "captcha_load_failed";

  if (code.startsWith("300") || code.startsWith("600")) {
    return "captcha_challenge_failed";
  }

  return "captcha_widget_error";
}

export interface PendingCaptchaAction {
  kind: "retry";
  run: () => void;
}

interface DetailCaptchaDialogProps {
  open: boolean;
  siteKey?: string;
  theme: "dark" | "light" | "system";
  language: TurnstileLangCode;
  pendingAction: PendingCaptchaAction | null;
  onOpenChange: (open: boolean) => void;
  onPendingActionChange: (next: PendingCaptchaAction | null) => void;
  onVerified: () => void;
}

export function DetailCaptchaDialog({
  open,
  siteKey,
  theme,
  language,
  pendingAction,
  onOpenChange,
  onPendingActionChange,
  onVerified,
}: DetailCaptchaDialogProps) {
  const { t } = useTranslation();
  const [captchaError, setCaptchaError] = useState("");
  const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
  const [captchaWidgetLoaded, setCaptchaWidgetLoaded] = useState(false);
  const [captchaVerifying, setCaptchaVerifying] = useState(false);
  const verifyRequestRef = useRef<AbortController | null>(null);
  const shouldRenderCaptchaWidget = Boolean(siteKey) && !captchaError;

  const closeDialog = () => {
    onOpenChange(false);
    onPendingActionChange(null);
    setCaptchaError("");
    setCaptchaWidgetLoaded(false);
    setCaptchaVerifying(false);
  };

  const showCaptchaError = (errorKey: string) => {
    setCaptchaWidgetLoaded(false);
    setCaptchaVerifying(false);
    setCaptchaError(errorKey);
  };

  const retryCaptchaWidget = () => {
    setCaptchaError("");
    setCaptchaVerifying(false);
    setCaptchaWidgetLoaded(false);
    setCaptchaWidgetKey((value) => value + 1);
  };

  useEffect(() => {
    if (!open) return;
    if (!siteKey) {
      setCaptchaError("captcha_misconfigured");
      return;
    }
    if (!shouldRenderCaptchaWidget) return;
    if (captchaWidgetLoaded) return;

    const timeoutId = window.setTimeout(() => {
      setCaptchaError((current) => current || "captcha_load_failed");
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [captchaWidgetLoaded, open, shouldRenderCaptchaWidget, siteKey, captchaWidgetKey]);

  useEffect(() => {
    return () => {
      const verifyRequest = verifyRequestRef.current;
      verifyRequestRef.current = null;
      verifyRequest?.abort();
    };
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDialog();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t.detail.security_check}</DialogTitle>
          <DialogDescription>{t.detail.complete_captcha}</DialogDescription>
        </DialogHeader>
        {shouldRenderCaptchaWidget && (
          <div className="flex justify-center py-4">
            <Turnstile
              key={`${language}:${captchaWidgetKey}`}
              siteKey={siteKey!}
              options={{
                theme: theme === "system" ? "auto" : theme,
                language,
                retry: "never",
                refreshExpired: "manual",
                refreshTimeout: "manual",
              }}
              onLoadScript={() => {
                setCaptchaWidgetLoaded(false);
              }}
              onWidgetLoad={() => {
                setCaptchaWidgetLoaded(true);
              }}
              onExpire={() => {
                showCaptchaError("captcha_expired");
              }}
              onTimeout={() => {
                showCaptchaError("captcha_timeout");
              }}
              onError={(errorCode) => {
                showCaptchaError(mapTurnstileClientError(errorCode));
              }}
              onUnsupported={() => {
                showCaptchaError("captcha_unsupported");
              }}
              scriptOptions={{
                onError: () => {
                  showCaptchaError("captcha_load_failed");
                },
              }}
              onSuccess={async (token) => {
                const previousRequest = verifyRequestRef.current;
                verifyRequestRef.current = null;
                previousRequest?.abort();

                const controller = new AbortController();
                verifyRequestRef.current = controller;
                setCaptchaVerifying(true);

                try {
                  const response = await fetch("/api/verify", {
                    method: "POST",
                    headers: buildPostJSONHeaders(),
                    signal: controller.signal,
                    body: JSON.stringify({ token }),
                  });
                  if (
                    verifyRequestRef.current !== controller ||
                    controller.signal.aborted
                  ) {
                    return;
                  }

                  if (response.ok) {
                    onVerified();
                    const pending = pendingAction;
                    onPendingActionChange(null);
                    setCaptchaError("");
                    setCaptchaWidgetLoaded(false);
                    setCaptchaVerifying(false);
                    onOpenChange(false);
                    if (pending?.kind === "retry") {
                      pending.run();
                    }
                    return;
                  }

                  const errorJSON = await response.json().catch(() => ({}));
                  if (
                    verifyRequestRef.current !== controller ||
                    controller.signal.aborted
                  ) {
                    return;
                  }

                  showCaptchaError(
                    typeof errorJSON?.error === "string" && errorJSON.error
                      ? getToolErrorMessage(errorJSON.error)
                      : "verification_failed",
                  );
                } catch (error) {
                  if (isAbortError(error)) {
                    return;
                  }

                  showCaptchaError(getToolErrorMessage(error));
                } finally {
                  if (verifyRequestRef.current === controller) {
                    verifyRequestRef.current = null;
                    setCaptchaVerifying(false);
                  }
                }
              }}
            />
          </div>
        )}
        {captchaError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.error.title}</AlertTitle>
            <AlertDescription>
              {captchaError in t.error
                ? t.error[captchaError as keyof typeof t.error]
                : captchaError}
            </AlertDescription>
          </Alert>
        )}
        {captchaError && (
          <DialogFooter className="flex-row justify-stretch sm:justify-end">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={closeDialog}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="default"
              className="flex-1 sm:flex-none"
              disabled={!siteKey || captchaVerifying}
              onClick={retryCaptchaWidget}
            >
              {captchaVerifying ? t.common.loading : t.common.retry}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

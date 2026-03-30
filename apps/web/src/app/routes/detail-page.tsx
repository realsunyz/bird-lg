import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/shared/ui/theme-provider";
import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { ErrorDisplay } from "@/shared/ui/error-display";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/shared/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TabsHighlight,
  TabsHighlightItem,
} from "@/shared/ui/animate-ui/primitives/radix/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";
import { useTranslation } from "@/shared/i18n/provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Turnstile } from "@marsidev/react-turnstile";
import { useConfig } from "@/entities/server/config-context";
import { type ClientConfig, type ServerConfig } from "@/entities/server/types";
import { buildPostJSONHeaders } from "@/shared/lib/csrf";
import { getLocalizedText } from "@/entities/server/localized-text";
import { RouteTab } from "@/features/bird-route/ui/route-tab";
import { PingTab } from "@/features/ping/ui/ping-tab";
import { TraceTab } from "@/features/trace/ui/trace-tab";
import { getToolErrorMessage, isAbortError } from "@/shared/api/tool-client";
import { AppHeader } from "@/shared/ui/app-header";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

const tabsListClass =
  "flex w-full min-w-max items-stretch justify-start gap-4 md:gap-8 bg-transparent p-0 px-4 md:px-6";
const tabsTriggerClass =
  "rounded-none px-0 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

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
  if (code === "200100") return "captcha_verification_failed";
  if (code === "200500") return "captcha_load_failed";
  
  if (code.startsWith("300") || code.startsWith("600")) {
    return "captcha_challenge_failed";
  }
  
  return "captcha_widget_error";
}

function isCaptchaRetryable(errorKey: string): boolean {
  switch (errorKey) {
    case "captcha_domain_not_allowed":
    case "captcha_misconfigured":
    case "captcha_unsupported":
    case "captcha_verification_failed":
      return false;
    default:
      return true;
  }
}

export default function DetailPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const { t } = useTranslation();
  const config = useConfig();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const server = config.servers.find((s) => s.id === serverId);

  if (!server) {
    return (
      <div className="flex-1 bg-background flex flex-col font-sans">
        <AppHeader />
        <ErrorDisplay
          title={t.error.page_not_found_title}
          description={t.error.page_not_found_description}
          variant="default"
        >
          <Button asChild>
            <Link to="/">{t.common.back_to_home}</Link>
          </Button>
        </ErrorDisplay>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background flex flex-col font-sans">
      <AppHeader />
      <QueryInterface server={server} config={config} />
    </div>
  );
}

function QueryInterface({
  server,
  config,
}: {
  server: ServerConfig;
  config: ClientConfig;
}) {
  const { t, locale } = useTranslation();
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [lastCommand, setLastCommand] = useState("");
  const serverName = getLocalizedText(server.name, locale);

  const isSSO = config?.auth?.authType === "sso";
  const [hasToolAuth, setHasToolAuth] = useState(
    Boolean(config?.auth?.isAuthenticated),
  );
  const requiresCaptcha = Boolean(config?.turnstile?.siteKey);
  const canRunToolImmediately = !requiresCaptcha || hasToolAuth;

  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab");
  const validTabs = ["ping", "trace", ...(isSSO ? ["route"] : [])];
  const initialTab =
    defaultTab && validTabs.includes(defaultTab) ? defaultTab : "ping";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [enableTabSwitchAnimation, setEnableTabSwitchAnimation] =
    useState(false);

  const [routePreset, setRoutePreset] = useState("show protocols");
  const [routeInput, setRouteInput] = useState("");

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [showSSOLogin, setShowSSOLogin] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    kind: "retry";
    run: () => void;
  } | null>(null);
  const [captchaError, setCaptchaError] = useState("");
  const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
  const [captchaWidgetLoaded, setCaptchaWidgetLoaded] = useState(false);
  const [captchaVerifying, setCaptchaVerifying] = useState(false);
  const birdRequestRef = useRef<AbortController | null>(null);
  const verifyRequestRef = useRef<AbortController | null>(null);
  const mobileNoticeShownRef = useRef(false);
  const loginRedirect =
    typeof window === "undefined"
      ? `/detail/${server.id}`
      : `${window.location.pathname}${window.location.search}`;
  const shouldRenderCaptchaWidget =
    Boolean(config?.turnstile?.siteKey) &&
    (!captchaError || isCaptchaRetryable(captchaError));

  useEffect(() => {
    if (!isMobile || mobileNoticeShownRef.current) return;
    mobileNoticeShownRef.current = true;
    toast.warning(t.detail.mobile_limited_notice);
  }, [isMobile, t.detail.mobile_limited_notice]);

  const requestCaptcha = (run: () => void) => {
    setCaptchaError("");
    setCaptchaWidgetLoaded(false);
    setCaptchaVerifying(false);
    setPendingAction({ kind: "retry", run });
    setShowCaptcha(true);
  };

  const handleToolUnauthorized = (run: () => void) => {
    setHasToolAuth(false);
    requestCaptcha(run);
  };

  const requestSSOLogin = () => {
    setShowSSOLogin(true);
  };

  const resetCaptchaWidget = (errorKey = "") => {
    setCaptchaWidgetLoaded(false);
    setCaptchaVerifying(false);
    setCaptchaError(errorKey);
    setCaptchaWidgetKey((value) => value + 1);
  };

  const showCaptchaError = (errorKey: string) => {
    setCaptchaWidgetLoaded(false);
    setCaptchaVerifying(false);
    setCaptchaError(errorKey);
  };

  useEffect(() => {
    if (!showCaptcha) return;
    if (!config?.turnstile?.siteKey) {
      setCaptchaError("captcha_misconfigured");
      return;
    }
    if (!shouldRenderCaptchaWidget) return;
    if (captchaWidgetLoaded) return;

    const timeoutId = window.setTimeout(() => {
      setCaptchaError((current) => current || "captcha_load_failed");
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [
    captchaWidgetKey,
    captchaWidgetLoaded,
    config?.turnstile?.siteKey,
    shouldRenderCaptchaWidget,
    showCaptcha,
  ]);

  useEffect(() => {
    return () => {
      const birdRequest = birdRequestRef.current;
      birdRequestRef.current = null;
      birdRequest?.abort();

      const verifyRequest = verifyRequestRef.current;
      verifyRequestRef.current = null;
      verifyRequest?.abort();
    };
  }, []);

  const runBirdQuery = async (command: string) => {
    const previousRequest = birdRequestRef.current;
    birdRequestRef.current = null;
    previousRequest?.abort();

    const controller = new AbortController();
    birdRequestRef.current = controller;
    setLoading(true);
    setError("");
    setResult(null);
    setLastCommand(command);

    try {
      const res = await fetch("/api/bird", {
        method: "POST",
        headers: buildPostJSONHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          type: "bird",
          server: server.id,
          command: command.trim(),
        }),
      });

      if (birdRequestRef.current !== controller || controller.signal.aborted) {
        return;
      }

      if (res.status === 401 || res.status === 403) {
        requestSSOLogin();
        return;
      }

      const data = await res.json();
      if (birdRequestRef.current !== controller || controller.signal.aborted) {
        return;
      }
      if (data.rateLimit) setError("rate_limit_exceeded");
      else if (data.error) setError(getToolErrorMessage(data.error));
      else setResult(data);
    } catch (e) {
      if (isAbortError(e)) {
        return;
      }
      setError(getToolErrorMessage(e));
    } finally {
      if (birdRequestRef.current === controller) {
        birdRequestRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleProtocolSelect = (name: string) => {
    setRoutePreset("show protocols");
    setRouteInput(name);
    runBirdQuery(`show protocols all ${name}`);
  };

  if (showSSOLogin) {
    return (
      <div className="flex-1 flex flex-col justify-center py-10">
        <ErrorDisplay
          title={t.admin.login_required_title}
          description={t.admin.login_required_description}
          variant="warning"
        >
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <a href={`/api/auth/login?redirect=${encodeURIComponent(loginRedirect)}`}>
                {t.home.account_menu.login}
              </a>
            </Button>
            <Button variant="outline" onClick={() => setShowSSOLogin(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </ErrorDisplay>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 max-w-7xl mx-auto w-full pt-6 pb-8 md:px-8 md:pb-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList className="font-sans">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">{t.detail.pops}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>{">"}</BreadcrumbSeparator>
          <BreadcrumbItem>
            <span className="text-foreground/80">{serverName}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setEnableTabSwitchAnimation(true);
          setActiveTab(v);
          setSearchParams(
            (prev) => {
              prev.set("tab", v);
              return prev;
            },
            { replace: true },
          );
        }}
        className="w-full gap-0"
      >
        <Card>
          <CardHeader className="p-0 border-b">
            <TabsHighlight
              forceUpdateBounds
              mode="parent"
              containerClassName="w-full overflow-x-auto"
              className="rounded-none bg-transparent border-b-2 border-foreground"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            >
              <TabsList className={tabsListClass}>
                <TabsHighlightItem value="ping" asChild>
                  <TabsTrigger value="ping" className={tabsTriggerClass}>
                    {t.detail.ping}
                  </TabsTrigger>
                </TabsHighlightItem>
                <TabsHighlightItem value="trace" asChild>
                  <TabsTrigger value="trace" className={tabsTriggerClass}>
                    {t.detail.trace}
                  </TabsTrigger>
                </TabsHighlightItem>
                {isSSO && (
                  <TabsHighlightItem value="route" asChild>
                    <TabsTrigger value="route" className={tabsTriggerClass}>
                      {t.detail.route}
                    </TabsTrigger>
                  </TabsHighlightItem>
                )}
              </TabsList>
            </TabsHighlight>
          </CardHeader>
          <CardContent className="pt-6">
            <TabsContent
              value="ping"
              forceMount
              className="mt-0"
              initial={
                enableTabSwitchAnimation
                  ? { opacity: 0, filter: "blur(4px)" }
                  : false
              }
            >
              <PingTab
                activeServer={server.id}
                isSSO={config?.auth?.authType === "sso"}
                canRunWithoutCaptcha={canRunToolImmediately}
                onUnauthorized={handleToolUnauthorized}
              />
            </TabsContent>
            <TabsContent
              value="trace"
              forceMount
              className="mt-0"
              initial={
                enableTabSwitchAnimation
                  ? { opacity: 0, filter: "blur(4px)" }
                  : false
              }
            >
              <TraceTab
                activeServer={server.id}
                canRunWithoutCaptcha={canRunToolImmediately}
                onUnauthorized={handleToolUnauthorized}
              />
            </TabsContent>
            {isSSO && (
              <TabsContent
                value="route"
                forceMount
                className="mt-0"
                initial={
                  enableTabSwitchAnimation
                    ? { opacity: 0, filter: "blur(4px)" }
                    : false
                }
              >
                <RouteTab
                  runBirdQuery={runBirdQuery}
                  loading={loading}
                  result={result}
                  error={error}
                  lastCommand={lastCommand}
                  preset={routePreset}
                  setPreset={(v) => {
                    setRoutePreset(v);
                    setResult(null);
                    setError("");
                  }}
                  input={routeInput}
                  setInput={setRouteInput}
                  onProtocolSelect={handleProtocolSelect}
                />
              </TabsContent>
            )}
          </CardContent>
        </Card>
      </Tabs>

      <Dialog
        open={showCaptcha}
        onOpenChange={(open) => {
          setShowCaptcha(open);
          if (!open) {
            setPendingAction(null);
            setCaptchaError("");
            setCaptchaWidgetLoaded(false);
            setCaptchaVerifying(false);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t.detail.security_check}</DialogTitle>
            <DialogDescription>{t.detail.complete_captcha}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {shouldRenderCaptchaWidget && (
              <Turnstile
                key={captchaWidgetKey}
                siteKey={config.turnstile.siteKey}
                options={{
                  theme: theme === "system" ? "auto" : theme,
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
                  resetCaptchaWidget("captcha_expired");
                }}
                onTimeout={() => {
                  resetCaptchaWidget("captcha_timeout");
                }}
                onError={(errorCode) => {
                  const errorKey = mapTurnstileClientError(errorCode);
                  if (isCaptchaRetryable(errorKey)) {
                    resetCaptchaWidget(errorKey);
                    return;
                  }
                  showCaptchaError(errorKey);
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
                    const res = await fetch("/api/verify", {
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
                    if (res.ok) {
                      setHasToolAuth(true);
                      setShowCaptcha(false);
                      setCaptchaError("");
                      setCaptchaWidgetLoaded(false);
                      setCaptchaVerifying(false);
                      const pending = pendingAction;
                      setPendingAction(null);
                      if (pending?.kind === "retry") {
                        pending.run();
                      }
                    } else {
                      const errJson = await res.json().catch(() => ({}));
                      if (
                        verifyRequestRef.current !== controller ||
                        controller.signal.aborted
                      ) {
                        return;
                      }
                      resetCaptchaWidget(
                        typeof errJson?.error === "string" && errJson.error
                          ? getToolErrorMessage(errJson.error)
                          : "verification_failed",
                      );
                    }
                  } catch (e) {
                    if (isAbortError(e)) {
                      return;
                    }
                    resetCaptchaWidget(getToolErrorMessage(e));
                  } finally {
                    if (verifyRequestRef.current === controller) {
                      verifyRequestRef.current = null;
                      setCaptchaVerifying(false);
                    }
                  }
                }}
              />
            )}
          </div>
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
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCaptcha(false);
                  setPendingAction(null);
                  setCaptchaError("");
                  setCaptchaWidgetLoaded(false);
                  setCaptchaVerifying(false);
                }}
              >
                {t.common.cancel}
              </Button>
              {isCaptchaRetryable(captchaError) && (
                <Button
                  variant="secondary"
                  disabled={!config?.turnstile?.siteKey || captchaVerifying}
                  onClick={() => {
                    resetCaptchaWidget("");
                  }}
                >
                  {captchaVerifying ? t.common.loading : t.common.retry}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/shared/ui/theme-provider";

import { Button } from "@/shared/ui/button";
import { ErrorDisplay } from "@/shared/ui/error-display";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";
import { useTranslation } from "@/shared/i18n/provider";
import { type TurnstileLangCode } from "@marsidev/react-turnstile";
import { useConfig } from "@/entities/server/config-context";
import { type ClientConfig, type ServerConfig } from "@/entities/server/types";
import { getLocalizedText } from "@/entities/server/localized-text";
import { AppHeader } from "@/shared/ui/app-header";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import {
  DetailCaptchaDialog,
  type PendingCaptchaAction,
} from "@/app/routes/detail-page/detail-captcha-dialog";
import { DetailLoginRequired } from "@/app/routes/detail-page/detail-login-required";
import { DetailTabsCard } from "@/app/routes/detail-page/detail-tabs-card";
import { useBirdRouteQuery } from "@/app/routes/detail-page/use-bird-route-query";

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
  const turnstileLanguage: TurnstileLangCode =
    locale === "zh" ? "zh-CN" : "en";
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

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [showSSOLogin, setShowSSOLogin] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingCaptchaAction | null>(null);
  const mobileNoticeShownRef = useRef(false);
  const loginRedirect =
    typeof window === "undefined"
      ? `/detail/${server.id}`
      : `${window.location.pathname}${window.location.search}`;
  const requestSSOLogin = () => {
    setShowSSOLogin(true);
  };
  const {
    loading,
    error,
    result,
    lastCommand,
    routePreset,
    setRoutePreset,
    routeInput,
    setRouteInput,
    runBirdQuery,
    handleProtocolSelect,
  } = useBirdRouteQuery(server.id, requestSSOLogin);

  useEffect(() => {
    if (!isMobile || mobileNoticeShownRef.current) return;
    mobileNoticeShownRef.current = true;
    toast.warning(t.detail.mobile_limited_notice);
  }, [isMobile, t.detail.mobile_limited_notice]);

  const requestCaptcha = (run: () => void) => {
    setPendingAction({ kind: "retry", run });
    setShowCaptcha(true);
  };

  const handleToolUnauthorized = (run: () => void) => {
    setHasToolAuth(false);
    requestCaptcha(run);
  };

  if (showSSOLogin) {
    return (
      <DetailLoginRequired
        loginRedirect={loginRedirect}
        onCancel={() => setShowSSOLogin(false)}
      />
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

      <DetailTabsCard
        activeTab={activeTab}
        enableTabSwitchAnimation={enableTabSwitchAnimation}
        isSSO={isSSO}
        serverId={server.id}
        canRunWithoutCaptcha={canRunToolImmediately}
        loading={loading}
        result={result}
        error={error}
        lastCommand={lastCommand}
        routePreset={routePreset}
        setRoutePreset={setRoutePreset}
        routeInput={routeInput}
        setRouteInput={setRouteInput}
        onValueChange={(value) => {
          setEnableTabSwitchAnimation(true);
          setActiveTab(value);
          setSearchParams(
            (prev) => {
              prev.set("tab", value);
              return prev;
            },
            { replace: true },
          );
        }}
        onUnauthorized={handleToolUnauthorized}
        onProtocolSelect={handleProtocolSelect}
        runBirdQuery={runBirdQuery}
      />

      <DetailCaptchaDialog
        open={showCaptcha}
        siteKey={config.turnstile?.siteKey}
        theme={theme}
        language={turnstileLanguage}
        pendingAction={pendingAction}
        onOpenChange={setShowCaptcha}
        onPendingActionChange={setPendingAction}
        onVerified={() => {
          setHasToolAuth(true);
        }}
      />

    </div>
  );
}

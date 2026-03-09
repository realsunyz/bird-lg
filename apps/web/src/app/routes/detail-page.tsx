import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTheme } from "@/shared/ui/theme-provider";
import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
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
import { TracerouteTab } from "@/features/traceroute/ui/traceroute-tab";
import { getToolErrorMessage } from "@/shared/api/tool-client";
import { AppHeader } from "@/shared/ui/app-header";

const tabsListClass =
  "flex w-full min-w-max items-stretch justify-start gap-4 md:gap-8 bg-transparent p-0 px-4 md:px-6";
const tabsTriggerClass =
  "rounded-none px-0 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

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
      <div className="flex-1 bg-background flex items-center justify-center font-sans">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t.error.title}</CardTitle>
            <CardDescription>{t.error.server_not_found}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/">{t.common.back_to_home}</Link>
            </Button>
          </CardContent>
        </Card>
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

function QueryInterface({ server, config }: { server: ServerConfig; config: ClientConfig }) {
  const { t, locale } = useTranslation();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [lastCommand, setLastCommand] = useState("");
  const serverName = getLocalizedText(server.name, locale);

  const isSSO = config?.auth?.authType === "sso";
  const [activeTab, setActiveTab] = useState("ping");
  const [enableTabSwitchAnimation, setEnableTabSwitchAnimation] = useState(false);

  const [routePreset, setRoutePreset] = useState("show protocols");
  const [routeInput, setRouteInput] = useState("");

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | {
        kind: "query";
        command: string;
      }
    | {
        kind: "retry";
        run: () => void;
      }
    | null
  >(null);
  const [captchaError, setCaptchaError] = useState("");

  const requestCaptcha = (run: () => void) => {
    setCaptchaError("");
    setPendingAction({ kind: "retry", run });
    setShowCaptcha(true);
  };

  const runBirdQuery = async (command: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    setLastCommand(command);

    try {
      const res = await fetch("/api/bird", {
        method: "POST",
        headers: buildPostJSONHeaders(),
        body: JSON.stringify({
          type: "bird",
          server: server.id,
          command: command.trim(),
        }),
      });

      if (res.status === 401) {
        setCaptchaError("");
        setPendingAction({ kind: "query", command });
        setShowCaptcha(true);
        return;
      }
      if (res.status === 403) {
        setError("auth_required");
        return;
      }

      const data = await res.json();
      if (data.rateLimit) setError("rate_limit_exceeded");
      else if (data.error) setError(getToolErrorMessage(data.error));
      else setResult(data);
    } catch (e) {
      setError(getToolErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleProtocolSelect = (name: string) => {
    setRoutePreset("show protocols");
    setRouteInput(name);
    runBirdQuery(`show protocols all ${name}`);
  };

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
          setResult(null);
          setError("");
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
                <TabsHighlightItem value="traceroute" asChild>
                  <TabsTrigger value="traceroute" className={tabsTriggerClass}>
                    {t.detail.traceroute}
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
              className="mt-0"
              initial={enableTabSwitchAnimation ? { opacity: 0, filter: "blur(4px)" } : false}
            >
                <PingTab
                  activeServer={server.id}
                  isSSO={config?.auth?.authType === "sso"}
                  onUnauthorized={(retry) => requestCaptcha(retry)}
                />
            </TabsContent>
            <TabsContent
              value="traceroute"
              className="mt-0"
              initial={enableTabSwitchAnimation ? { opacity: 0, filter: "blur(4px)" } : false}
            >
                <TracerouteTab
                  activeServer={server.id}
                  onUnauthorized={(retry) => requestCaptcha(retry)}
                />
            </TabsContent>
            {isSSO && (
              <TabsContent
                value="route"
                className="mt-0"
                initial={enableTabSwitchAnimation ? { opacity: 0, filter: "blur(4px)" } : false}
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
            {config?.turnstile?.siteKey && (
              <Turnstile
                siteKey={config.turnstile.siteKey}
                options={{ theme: theme === "system" ? "auto" : theme }}
                onSuccess={async (token) => {
                  try {
                    const res = await fetch("/api/verify", {
                      method: "POST",
                      headers: buildPostJSONHeaders(),
                      body: JSON.stringify({ token }),
                    });
                    if (res.ok) {
                      setShowCaptcha(false);
                      const pending = pendingAction;
                      setPendingAction(null);
                      if (pending?.kind === "query") {
                        runBirdQuery(pending.command);
                      } else if (pending?.kind === "retry") {
                        pending.run();
                      }
                    } else {
                      const errJson = await res.json().catch(() => ({}));
                      setCaptchaError(
                        typeof errJson?.error === "string" && errJson.error
                          ? getToolErrorMessage(errJson.error)
                          : "verification_failed",
                      );
                    }
                  } catch (e) {
                    setCaptchaError(getToolErrorMessage(e));
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

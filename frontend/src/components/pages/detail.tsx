import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TabsHighlight,
  TabsHighlightItem,
} from "@/components/animate-ui/primitives/radix/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PingResult } from "@/components/ping-result";
import { TracerouteResult } from "@/components/traceroute-result";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Turnstile } from "@marsidev/react-turnstile";
import { useConfig } from "@/contexts/config-context";
import { type ClientConfig, type ServerConfig } from "@/lib/types";
import { buildPostJSONHeaders } from "@/lib/csrf";
import { getLocalizedText } from "@/lib/localized-text";
import {
  extractErrorCode,
  validateTargetInput,
} from "@/lib/target-validation";

interface ProtocolInfo {
  name: string;
  proto: string;
  table: string;
  state: string;
  since: string;
  info: string;
}

const tabsListClass =
  "flex w-full min-w-max items-stretch justify-start gap-4 md:gap-8 bg-transparent p-0 px-4 md:px-6";
const tabsTriggerClass =
  "rounded-none px-0 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";
const toolInputClass = "flex-1 font-mono text-sm";

type StreamRequestOptions = {
  url: string;
  body: unknown;
  startError: string;
  onUnauthorized: () => void;
  onData: (line: string) => void;
};

async function consumeSSEResponse(
  response: Response,
  onData: (line: string) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    lines.forEach((line) => {
      if (line.startsWith("data: ")) {
        onData(line.substring(6));
      }
    });
  }
}

async function runStreamRequest({
  url,
  body,
  startError,
  onUnauthorized,
  onData,
}: StreamRequestOptions) {
  const response = await fetch(url, {
    method: "POST",
    headers: buildPostJSONHeaders(),
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    onUnauthorized();
    return;
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || startError);
  }

  await consumeSSEResponse(response, onData);
}

function getToolErrorMessage(
  value: unknown,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  const message = value instanceof Error ? value.message : String(value);
  const code = extractErrorCode(message);
  switch (code) {
    case "ERR-TARGET-400-EMPTY":
      return t.error.target_required;
    case "ERR-TARGET-400-FORMAT":
      return t.error.target_invalid_format;
    case "ERR-TARGET-400-BOGON":
      return t.error.target_bogon_blocked;
    case "ERR-SERVER-404":
      return t.error.server_not_found;
    case "ERR-REQ-400":
      return t.error.invalid_request;
    case "ERR-REQ-403-CSRF":
      return t.error.csrf_failed;
    case "ERR-REQ-408":
      return t.error.request_timeout;
    case "ERR-AUTH-401":
    case "ERR-AUTH-403-SSO_REQUIRED":
      return t.error.auth_required;
    case "ERR-RATE-429":
      return t.error.rate_limit_exceeded;
    case "ERR-CAPTCHA-503":
      return t.error.captcha_unavailable;
    case "ERR-CAPTCHA-403":
      return t.error.captcha_verification_failed;
    case "ERR-UPSTREAM-502-CONNECT":
    case "ERR-UPSTREAM-502-STATUS":
      return t.error.upstream_error;
    case "ERR-SSO-404":
    case "ERR-SSO-400-MISSING_CODE":
    case "ERR-SSO-400-MISSING_VERIFIER":
    case "ERR-SSO-401-TOKEN_EXCHANGE":
    case "ERR-SSO-500-VERIFIER_GEN":
      return t.error.sso_error;
    default:
      if (code) return t.error.unknown_error;
      return message;
  }
}

export default function DetailPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const { t } = useTranslation();
  const config = useConfig();

  const server = config.servers.find((s) => s.id === serverId);

  if (!server) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
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
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header title={config.app.title} />
      <QueryInterface server={server} config={config} />
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="border-b bg-card">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto w-full justify-between">
        <span className="text-lg font-normal font-title tracking-tight">
          {title}
        </span>
        <LanguageSwitcher />
      </div>
    </div>
  );
}

function QueryErrorAlert({ message }: { message: string }) {
  const { t } = useTranslation();
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t.error.title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const serverName = getLocalizedText(server.name, locale);

  const isSSO = config?.auth?.authType === "sso";
  const [activeTab, setActiveTab] = useState("ping");
  const [enableTabSwitchAnimation, setEnableTabSwitchAnimation] =
    useState(false);

  useEffect(() => {
    setEnableTabSwitchAnimation(true);
  }, []);

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
        setError(t.error.auth_required);
        return;
      }

      const data = await res.json();
      if (data.rateLimit) setError(t.error.rate_limit_exceeded);
      else if (data.error) setError(getToolErrorMessage(data.error, t));
      else setResult(data);
    } catch (e) {
      setError(getToolErrorMessage(e, t));
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
              <Link to="/">PoPs</Link>
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
                  <TabsTrigger
                    value="ping"
                    className={tabsTriggerClass}
                  >
                    {t.detail.ping}
                  </TabsTrigger>
                </TabsHighlightItem>
                <TabsHighlightItem value="traceroute" asChild>
                  <TabsTrigger
                    value="traceroute"
                    className={tabsTriggerClass}
                  >
                    {t.detail.traceroute}
                  </TabsTrigger>
                </TabsHighlightItem>
                {isSSO && (
                  <TabsHighlightItem value="route" asChild>
                    <TabsTrigger
                      value="route"
                      className={tabsTriggerClass}
                    >
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
              initial={
                enableTabSwitchAnimation
                  ? { opacity: 0, filter: "blur(4px)" }
                  : false
              }
            >
              <PingTab
                activeServer={server.id}
                isSSO={!!config?.auth?.isAuthenticated}
                onUnauthorized={(retry) => requestCaptcha(retry)}
              />
            </TabsContent>
            <TabsContent
              value="traceroute"
              className="mt-0"
              initial={
                enableTabSwitchAnimation
                  ? { opacity: 0, filter: "blur(4px)" }
                  : false
              }
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t.detail.security_check}
            </DialogTitle>
            <DialogDescription>
              {t.detail.complete_captcha}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {config?.turnstile?.siteKey && (
              <Turnstile
                siteKey={config.turnstile.siteKey}
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
                          ? getToolErrorMessage(errJson.error, t)
                          : t.error.verification_failed,
                      );
                    }
                  } catch (e) {
                    setCaptchaError(getToolErrorMessage(e, t));
                  }
                }}
              />
            )}
          </div>
          {captchaError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t.error.title}</AlertTitle>
              <AlertDescription>{captchaError}</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TabProps {
  runBirdQuery: (command: string) => Promise<void>;
  loading: boolean;
  result: unknown;
  error: string;
}

function RouteTab({
  runBirdQuery,
  loading,
  result,
  error,
  preset,
  setPreset,
  input,
  setInput,
  onProtocolSelect,
}: TabProps & {
  preset: string;
  setPreset: (v: string) => void;
  input: string;
  setInput: (v: string) => void;
  onProtocolSelect: (v: string) => void;
}) {
  const { t } = useTranslation();

  const handleSubmit = () => {
    if (preset === "show protocols") {
      if (!input.trim()) {
        runBirdQuery("show protocols");
      } else {
        runBirdQuery(`show protocols all ${input}`.trim());
      }
    } else if (preset === "custom") {
      runBirdQuery(input.trim());
    } else {
      runBirdQuery(`${preset} ${input}`.trim());
    }
  };

  const routeDataRaw = (result as { result?: { data: unknown }[] })?.result?.[0]
    ?.data;
  const routeData = typeof routeDataRaw === "string" ? routeDataRaw : "";
  const protocols =
    preset === "show protocols" ? parseProtocolSummary(routeData) : [];
  const filteredProtocols = protocols.filter((p) => {
    const proto = typeof p?.proto === "string" ? p.proto : "";
    return !["static", "device", "direct", "kernel"].includes(
      proto.toLowerCase(),
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="show protocols">show protocols</SelectItem>
            <SelectItem value="show route for">show route for</SelectItem>
            <SelectItem value="custom">custom</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={
            preset === "show protocols"
              ? "filter (optional)"
              : preset === "custom"
                ? "show status"
                : "1.1.1.0/24"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full sm:flex-1 font-mono text-sm"
        />
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? <Spinner /> : t.detail.execute}
        </Button>
      </div>
      <QueryErrorAlert message={error} />

      {preset === "show protocols" &&
        !loading &&
        !error &&
        filteredProtocols.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.detail.table.name}</TableHead>
                  <TableHead>{t.detail.table.proto}</TableHead>
                  <TableHead>{t.detail.table.state}</TableHead>
                  <TableHead>{t.detail.table.since}</TableHead>
                  <TableHead>{t.detail.table.info}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProtocols.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">
                      <button
                        onClick={() => onProtocolSelect(p.name)}
                        className="hover:underline cursor-pointer text-primary focus:outline-none"
                      >
                        {p.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{p.proto}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          getStateColor(p.state),
                        )}
                      >
                        {p.state}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {p.since}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.info}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      {routeData &&
        (preset !== "show protocols" || filteredProtocols.length === 0) && (
          <div className="rounded-md bg-muted p-4 overflow-x-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {routeData}
            </pre>
          </div>
        )}
    </div>
  );
}

function TracerouteTab({
  activeServer,
  onUnauthorized,
}: {
  activeServer: string;
  onUnauthorized: (retry: () => void) => void;
}) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState("");
  const [error, setError] = useState("");

  const handleTraceroute = async () => {
    const validation = validateTargetInput(target);
    if (!validation.ok) {
      if (validation.errorKey === "target_required") {
        setError(t.error.target_required);
      } else if (validation.errorKey === "target_bogon_blocked") {
        setError(t.error.target_bogon_blocked);
      } else {
        setError(t.error.target_invalid_format);
      }
      return;
    }

    const normalizedTarget = validation.normalized;
    setLoading(true);
    setRawData("");
    setError("");

    try {
      const params = new URLSearchParams({
        server: activeServer,
        target: normalizedTarget,
      });
      await runStreamRequest({
        url: `/api/tool/traceroute/stream?${params.toString()}`,
        body: { target: normalizedTarget },
        startError: t.detail.traceroute_start_failed,
        onUnauthorized: () => onUnauthorized(handleTraceroute),
        onData: (line) => {
          setRawData((prev) => prev + line + "\n");
        },
      });
    } catch (e) {
      setError(getToolErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={t.detail.traceroute_placeholder}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTraceroute()}
          className={toolInputClass}
        />
        <Button
          onClick={handleTraceroute}
          disabled={loading || target.trim().length === 0}
        >
          {loading ? <Spinner /> : t.detail.run}
        </Button>
      </div>
      <QueryErrorAlert message={error} />
      {rawData && <TracerouteResult rawOutput={rawData} />}
    </div>
  );
}

function PingTab({
  activeServer,
  isSSO,
  onUnauthorized,
}: {
  activeServer: string;
  isSSO: boolean;
  onUnauthorized: (retry: () => void) => void;
}) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [count, setCount] = useState("4");
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState("");
  const [error, setError] = useState("");

  const handlePing = async () => {
    const validation = validateTargetInput(target);
    if (!validation.ok) {
      if (validation.errorKey === "target_required") {
        setError(t.error.target_required);
      } else if (validation.errorKey === "target_bogon_blocked") {
        setError(t.error.target_bogon_blocked);
      } else {
        setError(t.error.target_invalid_format);
      }
      return;
    }

    const normalizedTarget = validation.normalized;
    setLoading(true);
    setRawData("");
    setError("");

    try {
      const countInt = parseInt(count) || 4;
      const params = new URLSearchParams({
        server: activeServer,
        target: normalizedTarget,
        count: String(countInt),
      });
      await runStreamRequest({
        url: `/api/tool/ping/stream?${params.toString()}`,
        body: { target: normalizedTarget, count: countInt },
        startError: t.detail.ping_start_failed,
        onUnauthorized: () => onUnauthorized(handlePing),
        onData: (line) => {
          setRawData((prev) => prev + line + "\n");
        },
      });
    } catch (e) {
      setError(getToolErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={t.detail.ping_placeholder}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePing()}
          className={toolInputClass}
        />
        <Select value={count} onValueChange={setCount}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t.detail.ping_count} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">
              {`1 ${t.detail.ping_packets}`}
            </SelectItem>
            <SelectItem value="2">
              {`2 ${t.detail.ping_packets}`}
            </SelectItem>
            <SelectItem value="4">
              {`4 ${t.detail.ping_packets}`}
            </SelectItem>
            <SelectItem value="8">
              {`8 ${t.detail.ping_packets}`}
            </SelectItem>
            {isSSO && (
              <>
                <SelectItem value="10">
                  {`10 ${t.detail.ping_packets}`}
                </SelectItem>
                <SelectItem value="20">
                  {`20 ${t.detail.ping_packets}`}
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        <Button
          onClick={handlePing}
          disabled={loading || target.trim().length === 0}
        >
          {loading ? <Spinner /> : t.detail.run}
        </Button>
      </div>
      <QueryErrorAlert message={error} />
      {rawData && <PingResult rawOutput={rawData} />}
    </div>
  );
}

function parseProtocolSummary(output: string): ProtocolInfo[] {
  const lines = output.split("\n");
  const result: ProtocolInfo[] = [];
  let headerSkipped = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!headerSkipped && line.startsWith("Name")) {
      headerSkipped = true;
      continue;
    }

    const fields = splitFields(line);
    if (fields.length < 5) continue;

    result.push({
      name: fields[0],
      proto: fields[1],
      table: fields[2],
      state: fields[3],
      since: fields[4],
      info: fields.length > 5 ? fields.slice(5).join(" ") : "",
    });
  }

  return result;
}

function splitFields(value: string): string[] {
  const fields: string[] = [];
  let start = -1;

  for (let index = 0; index < value.length; index++) {
    const ch = value[index];
    const isSpace = ch === " " || ch === "\t";
    if (!isSpace && start === -1) {
      start = index;
      continue;
    }
    if (isSpace && start !== -1) {
      fields.push(value.slice(start, index));
      start = -1;
    }
  }

  if (start !== -1) {
    fields.push(value.slice(start));
  }

  return fields;
}

function getStateColor(state: string): string {
  const lower = state.toLowerCase();
  if (lower.includes("established") || lower === "up") return "text-green-600";
  if (lower.includes("start") || lower.includes("connect"))
    return "text-yellow-600";
  if (lower.includes("down") || lower.includes("idle")) return "text-red-500";
  return "text-muted-foreground";
}

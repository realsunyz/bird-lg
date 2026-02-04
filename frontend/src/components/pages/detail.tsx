import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

interface ProtocolInfo {
  name: string;
  proto: string;
  table: string;
  state: string;
  since: string;
  info: string;
}

interface ServerConfig {
  id: string;
  name: string;
  location: string;
  icon?: string;
}

interface ClientConfig {
  turnstile: { siteKey: string };
  servers: ServerConfig[];
  app: { title: string };
  auth?: { isAuthenticated: boolean; user?: string; authType?: string };
}

export default function DetailPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [server, setServer] = useState<ServerConfig | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: ClientConfig) => {
        setConfig(data);
        const s = data.servers.find((s) => s.id === serverId);
        if (s) setServer(s);
        else setError(t.detail.server_not_found);
      })
      .catch(() => setError(t.detail.failed_load_config));
  }, [serverId, t]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t.common.error}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/")}>
              {t.common.back_to_home}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config || !server) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
          <div
            className="w-2 h-2 rounded-full bg-current animate-bounce"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-current animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-current animate-bounce"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
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

function QueryInterface({
  server,
  config,
}: {
  server: ServerConfig;
  config: ClientConfig;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);

  const isSSO = config?.auth?.authType === "logto";
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    // Small timeout to ensure layout is stable before triggering highlight
    const timer = setTimeout(() => {
      setActiveTab("ping");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const [routePreset, setRoutePreset] = useState("show protocols");
  const [routeInput, setRouteInput] = useState("");

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<{
    type: string;
    args?: string;
  } | null>(null);

  const query = async (type: string, args?: string) => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const body: Record<string, string> = { type, server: server.id };
      if (type === "traceroute" || type === "ping" || type === "mtr") {
        body.target = args || "";
      }

      // Select endpoint based on query type
      const endpoint =
        type === "bird" || type === "summary" ? "/api/bird" : "/api/query";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        // Trigger Captcha Dialog
        setPendingQuery({ type, args });
        setShowCaptcha(true);
        return;
      }

      if (res.status === 403) {
        setError(t.detail.auth_required || "Authentication required");
        return;
      }

      const data = await res.json();
      if (data.rateLimit) setError(t.detail.rate_limit_exceeded);
      else if (data.error) setError(data.error);
      else setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleProtocolSelect = (name: string) => {
    setRoutePreset("show protocols");
    setRouteInput(name);
    // Stay on route tab
    query("bird", `show protocols all ${name}`);
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
            <span className="text-foreground/80">{server.name}</span>
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
              <TabsList className="flex w-full min-w-max items-stretch justify-start gap-4 md:gap-8 bg-transparent p-0 px-4 md:px-6">
                <TabsHighlightItem value="ping" asChild>
                  <TabsTrigger
                    value="ping"
                    className="rounded-none px-0 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Ping
                  </TabsTrigger>
                </TabsHighlightItem>
                <TabsHighlightItem value="traceroute" asChild>
                  <TabsTrigger
                    value="traceroute"
                    className="rounded-none px-0 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Trace
                  </TabsTrigger>
                </TabsHighlightItem>
                <TabsHighlightItem value="mtr" asChild>
                  <TabsTrigger
                    value="mtr"
                    className="rounded-none px-0 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    MTR
                  </TabsTrigger>
                </TabsHighlightItem>
                {isSSO && (
                  <TabsHighlightItem value="route" asChild>
                    <TabsTrigger
                      value="route"
                      className="rounded-none px-0 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    >
                      {t.detail.route}
                    </TabsTrigger>
                  </TabsHighlightItem>
                )}
              </TabsList>
            </TabsHighlight>
          </CardHeader>
          <CardContent className="pt-6">
            <TabsContent value="ping" className="mt-0">
              <PingTab
                query={query}
                loading={loading}
                result={result}
                error={error}
              />
            </TabsContent>
            <TabsContent value="traceroute" className="mt-0">
              <TracerouteTab
                query={query}
                loading={loading}
                result={result}
                error={error}
              />
            </TabsContent>
            <TabsContent value="mtr" className="mt-0">
              <MtrTab
                query={query}
                loading={loading}
                result={result}
                error={error}
              />
            </TabsContent>
            {isSSO && (
              <TabsContent value="route" className="mt-0">
                <RouteTab
                  query={query}
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

      <Dialog open={showCaptcha} onOpenChange={setShowCaptcha}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t.detail.security_check || "Security Check"}
            </DialogTitle>
            <DialogDescription>
              {t.detail.complete_captcha ||
                "Please complete the CAPTCHA to continue."}
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
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token }),
                    });
                    if (res.ok) {
                      setShowCaptcha(false);
                      if (pendingQuery) {
                        query(pendingQuery.type, pendingQuery.args);
                        setPendingQuery(null);
                      }
                    } else {
                      setError("Verification failed");
                    }
                  } catch (e) {
                    setError("Verification error");
                  }
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TabProps {
  query: (type: string, args?: string) => Promise<void>;
  loading: boolean;
  result: unknown;
  error: string;
}

function RouteTab({
  query,
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
        query("summary");
      } else {
        query("bird", `show protocols all ${input}`.trim());
      }
    } else if (preset === "custom") {
      query("bird", input.trim());
    } else {
      query("bird", `${preset} ${input}`.trim());
    }
  };

  // Logic for Table Data (for show protocols)
  const protocols =
    (result as { result?: { data: ProtocolInfo[] }[] })?.result?.[0]?.data ||
    [];
  const filteredProtocols = protocols.filter(
    (p) =>
      !["static", "device", "direct", "kernel"].includes(p.proto.toLowerCase()),
  );

  // Logic for Code Block Data (for other queries)
  const routeData =
    (result as { result?: { data: string }[] })?.result?.[0]?.data || "";

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
          className="flex-1 font-mono"
        />
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? <Spinner /> : t.detail.execute}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Render Table if show protocols */}
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

      {/* Render Code Block if NOT show protocols */}
      {preset !== "show protocols" && routeData && (
        <div className="rounded-md bg-muted p-4 overflow-x-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {formatOutput(routeData)}
          </pre>
        </div>
      )}
    </div>
  );
}

function TracerouteTab({ query, loading, result, error }: TabProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const handleSubmit = () => {
    if (target) query("traceroute", target);
  };
  const data =
    (result as { result?: { data: string }[] })?.result?.[0]?.data || "";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={t.detail.traceroute_placeholder}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 font-mono"
        />
        <Button onClick={handleSubmit} disabled={loading || !target}>
          {loading ? <Spinner /> : t.detail.run}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {data && (
        <div className="rounded-md bg-muted p-4 overflow-x-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {formatOutput(data)}
          </pre>
        </div>
      )}
    </div>
  );
}

function PingTab({ query, loading, result, error }: TabProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const handleSubmit = () => {
    if (target) query("ping", target);
  };
  const data =
    (result as { result?: { data: string }[] })?.result?.[0]?.data || "";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="IP address or hostname"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 font-mono"
        />
        <Button onClick={handleSubmit} disabled={loading || !target}>
          {loading ? <Spinner /> : t.detail.run}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {data && (
        <div className="rounded-md bg-muted p-4 overflow-x-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">{data}</pre>
        </div>
      )}
    </div>
  );
}

function MtrTab({ query, loading, result, error }: TabProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const handleSubmit = () => {
    if (target) query("mtr", target);
  };
  const data =
    (result as { result?: { data: string }[] })?.result?.[0]?.data || "";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="IP address or hostname"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 font-mono"
        />
        <Button onClick={handleSubmit} disabled={loading || !target}>
          {loading ? <Spinner /> : t.detail.run}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {data && (
        <div className="rounded-md bg-muted p-4 overflow-x-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">{data}</pre>
        </div>
      )}
    </div>
  );
}

function getStateColor(state: string): string {
  const lower = state.toLowerCase();
  if (lower.includes("established") || lower === "up") return "text-green-600";
  if (lower.includes("start") || lower.includes("connect"))
    return "text-yellow-600";
  if (lower.includes("down") || lower.includes("idle")) return "text-red-500";
  return "text-muted-foreground";
}

function formatOutput(text: string) {
  const parts = text.split(/(\s+)/);
  return parts.map((part, index, arr) => {
    if (part.match(/^\s+$/)) return part;
    if (/^AS\d+$/i.test(part)) {
      return (
        <Link
          key={index}
          to={`/whois/${part.toUpperCase()}`}
          target="_blank"
          className="text-primary hover:underline"
        >
          {part}
        </Link>
      );
    }
    if (/^\d+$/.test(part)) {
      let prevPart = "";
      for (let i = index - 1; i >= 0; i--) {
        if (arr[i] && !/^\s+$/.test(arr[i])) {
          prevPart = arr[i];
          break;
        }
      }
      if (/AS:?$/i.test(prevPart)) {
        return (
          <Link
            key={index}
            to={`/whois/AS${part}`}
            target="_blank"
            className="text-primary hover:underline"
          >
            {part}
          </Link>
        );
      }
    }
    const ipv4Match = part.match(
      /^((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))(%[a-zA-Z0-9_-]+)?$/,
    );
    if (ipv4Match) {
      return (
        <span key={index}>
          <Link
            to={`/whois/${ipv4Match[1]}`}
            target="_blank"
            className="text-primary hover:underline"
          >
            {ipv4Match[1]}
          </Link>
          {ipv4Match[2] || ""}
        </span>
      );
    }
    const ipv6Match = part.match(
      /^((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::)(%[a-zA-Z0-9_-]+)?$/,
    );
    if (ipv6Match) {
      return (
        <span key={index}>
          <Link
            to={`/whois/${ipv6Match[1]}`}
            target="_blank"
            className="text-primary hover:underline"
          >
            {ipv6Match[1]}
          </Link>
          {ipv6Match[2] || ""}
        </span>
      );
    }
    return part;
  });
}

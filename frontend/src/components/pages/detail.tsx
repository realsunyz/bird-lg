import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

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
      <Header
        title={config.app.title}
        serverName={server.name}
        onBack={() => navigate("/")}
      />
      <QueryInterface server={server} serverId={serverId!} />
    </div>
  );
}

function Header({
  title,
  serverName,
  onBack,
}: {
  title: string;
  serverName?: string;
  onBack: () => void;
}) {
  return (
    <div className="border-b bg-card">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mr-2 -ml-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-lg font-normal font-title tracking-tight">
              {title}
            </span>
            {serverName && (
              <Badge variant="secondary" className="font-sans font-normal">
                {serverName}
              </Badge>
            )}
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );
}

function QueryInterface({
  server,
  serverId,
}: {
  server: ServerConfig;
  serverId: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [routePreset, setRoutePreset] = useState("show route for");
  const [routeInput, setRouteInput] = useState("");

  const query = async (type: string, args?: string) => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const body: Record<string, string> = { type, server: server.id };
      if (type === "bird") body.command = args || "";
      if (type === "traceroute") body.target = args || "";

      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        sessionStorage.setItem("auth_redirect", `/detail/${serverId}`);
        navigate("/captcha");
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
    setRoutePreset("show protocols all");
    setRouteInput(name);
    setActiveTab("route");
    query("bird", `show protocols all ${name}`);
  };

  return (
    <div className="flex-1 py-8 px-4 md:p-8 max-w-7xl mx-auto w-full">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setResult(null);
          setError("");
        }}
        className="w-full gap-8"
      >
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="summary">{t.detail.summary}</TabsTrigger>
          <TabsTrigger value="route">{t.detail.route}</TabsTrigger>
          <TabsTrigger value="traceroute">{t.detail.traceroute}</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-6">
            <TabsContent value="summary" className="mt-0">
              <SummaryTab
                query={query}
                loading={loading}
                result={result}
                error={error}
                onProtocolSelect={handleProtocolSelect}
              />
            </TabsContent>
            <TabsContent value="route" className="mt-0">
              <RouteTab
                query={query}
                loading={loading}
                result={result}
                error={error}
                preset={routePreset}
                setPreset={setRoutePreset}
                input={routeInput}
                setInput={setRouteInput}
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
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

interface TabProps {
  query: (type: string, args?: string) => Promise<void>;
  loading: boolean;
  result: unknown;
  error: string;
}

function SummaryTab({
  query,
  loading,
  result,
  error,
  onProtocolSelect,
}: TabProps & { onProtocolSelect: (name: string) => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    query("summary");
  }, []);
  const protocols =
    (result as { result?: { data: ProtocolInfo[] }[] })?.result?.[0]?.data ||
    [];
  const filtered = protocols.filter(
    (p) =>
      !["static", "device", "direct", "kernel"].includes(p.proto.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium font-title">
        {t.detail.protocol_summary}
      </h3>
      {loading && (
        <div className="py-12 flex justify-center text-muted-foreground">
          {t.detail.loading_protocols}
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!loading && !error && filtered.length > 0 && (
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
              {filtered.map((p, i) => (
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
    </div>
  );
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
}: TabProps & {
  preset: string;
  setPreset: (v: string) => void;
  input: string;
  setInput: (v: string) => void;
}) {
  const { t } = useTranslation();
  const handleSubmit = () => query("bird", `${preset} ${input}`.trim());
  const data =
    (result as { result?: { data: string }[] })?.result?.[0]?.data || "";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium font-title">{t.detail.route_query}</h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="show route for">show route for</SelectItem>
            <SelectItem value="show protocols all">
              show protocols all
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="1.1.1.0/24"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 font-mono"
        />
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : t.detail.execute}
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
      <h3 className="text-lg font-medium font-title">{t.detail.traceroute}</h3>
      <div className="flex gap-2">
        <Input
          placeholder={t.detail.traceroute_placeholder}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 font-mono"
        />
        <Button onClick={handleSubmit} disabled={loading || !target}>
          {loading ? <Loader2 className="animate-spin" /> : t.detail.run}
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

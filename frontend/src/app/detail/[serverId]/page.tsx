"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Script from "next/script";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import Link from "next/link";
import { cn } from "@/lib/utils";

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

export default function DetailPage() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.serverId as string;

  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [server, setServer] = useState<ServerConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const widgetIdRef = useRef<string | null>(null);

  // Load config
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: ClientConfig) => {
        setConfig(data);
        const s = data.servers.find((s) => s.id === serverId);
        if (s) {
          setServer(s);
          // Check session storage for verification
          const storedToken = sessionStorage.getItem("turnstileToken");
          const storedServerId = sessionStorage.getItem("serverId");
          if (storedToken && storedServerId === serverId) {
            setToken(storedToken);
            setVerified(true);
          }
        } else {
          setError("Server not found");
        }
      })
      .catch(() => setError("Failed to load config"));
  }, [serverId]);

  // Init Turnstile
  useEffect(() => {
    if (!config || !server || verified || widgetIdRef.current) return;

    const initTurnstile = () => {
      const container = document.getElementById("turnstile-container");
      if (container && window.turnstile && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: config.turnstile.siteKey,
          callback: (t: string) => {
            setToken(t);
            setVerified(true);
            sessionStorage.setItem("turnstileToken", t);
            sessionStorage.setItem("serverId", serverId);
          },
          "error-callback": () => {
            setError("Verification failed");
          },
        });
      }
    };

    if (window.turnstile) initTurnstile();
    else window.onTurnstileLoad = initTurnstile;
  }, [config, server, verified, serverId]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to Home
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

  // Show verification first
  if (!verified) {
    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
          async
          defer
        />
        <div className="min-h-screen bg-background flex flex-col font-sans">
          <Header title={config.app.title} onBack={() => router.push("/")} />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Card className="max-w-md w-full">
              <CardHeader className="items-center text-center pb-2">
                <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center bg-muted/30 mb-4 font-title text-foreground">
                  <span className="text-2xl font-medium">
                    {server.icon || server.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <CardTitle className="font-title text-2xl">
                  {server.name}
                </CardTitle>
                <CardDescription className="font-sans">
                  {server.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground mb-4 font-sans text-center">
                  Please complete verification to access tools
                </p>
                <div id="turnstile-container" className="mb-2 min-h-[65px]" />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Show query interface after verification
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header
        title={config.app.title}
        serverName={server.name}
        onBack={() => router.push("/")}
      />
      <QueryInterface server={server} token={token!} />
    </div>
  );
}

// Header component
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
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-2 -ml-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold font-title tracking-tight">
            {title}
          </span>
          {serverName && (
            <Badge variant="secondary" className="font-sans font-normal">
              {serverName}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Query interface component
function QueryInterface({
  server,
  token,
}: {
  server: ServerConfig;
  token: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState("summary");

  // Lifted state for RouteTab
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
        headers: {
          "Content-Type": "application/json",
          "X-Turnstile-Token": token,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleProtocolSelect = (name: string) => {
    const preset = "show protocols all";
    setRoutePreset(preset);
    setRouteInput(name);
    setActiveTab("route");
    query("bird", `${preset} ${name}`);
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setResult(null);
          setError("");
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="route">Route</TabsTrigger>
          <TabsTrigger value="traceroute">Traceroute</TabsTrigger>
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
  useEffect(() => {
    query("summary");
  }, []);
  const protocols =
    (result as { result?: { data: ProtocolInfo[] }[] })?.result?.[0]?.data ||
    [];

  const filteredProtocols = protocols.filter(
    (p) =>
      !["static", "device", "direct", "kernel"].includes(p.proto.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium font-title">Protocol Summary</h3>

      {loading && (
        <div className="py-12 flex justify-center text-muted-foreground">
          Loading protocols...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filteredProtocols.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Proto</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Info</TableHead>
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
  const handleSubmit = () => query("bird", `${preset} ${input}`.trim());
  const data =
    (result as { result?: { data: string }[] })?.result?.[0]?.data || "";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium font-title">Route Query</h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="show route for">show route for</SelectItem>
            <SelectItem value="show route protocol">
              show route protocol
            </SelectItem>
            <SelectItem value="show protocols all">
              show protocols all
            </SelectItem>
            <SelectItem value="show route where">show route where</SelectItem>
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
          {loading ? "Executing..." : "Execute"}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
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
  const [target, setTarget] = useState("");
  const handleSubmit = () => {
    if (target) query("traceroute", target);
  };
  const data =
    (result as { result?: { data: string }[] })?.result?.[0]?.data || "";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium font-title">Traceroute</h3>
      <div className="flex gap-2">
        <Input
          placeholder="1.1.1.1 or example.com"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 font-mono"
        />
        <Button onClick={handleSubmit} disabled={loading || !target}>
          {loading ? "Running..." : "Run"}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
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
  const parts = text.split(/(\s+)/); // Preserves whitespace
  return parts.map((part, index) => {
    if (part.match(/^\s+$/)) return part; // Return whitespace as is

    // Check ASN
    if (part.match(/^AS\d+$/i)) {
      return (
        <Link
          key={index}
          href={`/whois/${part}`}
          target="_blank"
          className="text-primary hover:underline hover:text-blue-500 transition-colors"
        >
          {part}
        </Link>
      );
    }
    // Check IPv4
    if (
      part.match(
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      )
    ) {
      return (
        <Link
          key={index}
          href={`/whois/${part}`}
          target="_blank"
          className="text-primary hover:underline hover:text-blue-500 transition-colors"
        >
          {part}
        </Link>
      );
    }
    // Check IPv6 (basic check)
    if (part.includes(":") && !part.includes("http") && part.length > 2) {
      return (
        <Link
          key={index}
          href={`/whois/${part}`}
          target="_blank"
          className="text-primary hover:underline hover:text-blue-500 transition-colors"
        >
          {part}
        </Link>
      );
    }

    return part;
  });
}

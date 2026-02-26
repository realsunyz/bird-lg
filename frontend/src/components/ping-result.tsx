import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { RawOutputPanel } from "@/components/raw-output-panel";
import { useTranslation } from "@/components/i18n-provider";

interface PingResultProps {
  rawOutput: string;
}

interface PingStats {
  transmitted: number;
  received: number;
  loss: number;
  time?: number;
  min?: number;
  avg?: number;
  max?: number;
  mdev?: number;
}

interface PingSequence {
  seq: number;
  ttl: number;
  time: number;
  ip: string;
  status: "success" | "timeout" | "error";
  raw: string;
}

export function PingResult({ rawOutput }: PingResultProps) {
  const { t } = useTranslation();
  const { stats, sequences } = useMemo<{
    stats: PingStats | null;
    sequences: PingSequence[];
  }>(() => {
    const lines = rawOutput.split("\n");
    const sequences: PingSequence[] = [];
    let stats: PingStats | null = null;

    const seqRegex =
      /(\d+) bytes from ([a-fA-F0-9:.]+).*?: icmp_seq=(\d+) ttl=(\d+) time=([\d\.]+) ms/;
    const statsHeaderRegex = /(\d+) packets transmitted, (\d+) received, ([\d\.]+)% packet loss/;
    const rttRegex = /rtt min\/avg\/max\/mdev = ([\d\.]+)\/([\d\.]+)\/([\d\.]+)\/([\d\.]+) ms/;

    lines.forEach((line) => {
      const seqMatch = line.match(seqRegex);
      if (seqMatch) {
        sequences.push({
          ip: seqMatch[2],
          seq: parseInt(seqMatch[3]),
          ttl: parseInt(seqMatch[4]),
          time: parseFloat(seqMatch[5]),
          status: "success",
          raw: line,
        });
        return;
      }

      if (line.includes("Request timeout") || line.includes("Destination Host Unreachable")) {
      }

      const statsMatch = line.match(statsHeaderRegex);
      if (statsMatch) {
        stats = {
          transmitted: parseInt(statsMatch[1]),
          received: parseInt(statsMatch[2]),
          loss: parseFloat(statsMatch[3]),
          ...(stats || {}),
        } as PingStats;
      }

      const rttMatch = line.match(rttRegex);
      if (rttMatch) {
        stats = {
          ...(stats || { transmitted: 0, received: 0, loss: 0 }),
          min: parseFloat(rttMatch[1]),
          avg: parseFloat(rttMatch[2]),
          max: parseFloat(rttMatch[3]),
          mdev: parseFloat(rttMatch[4]),
        } as PingStats;
      }
    });

    return { stats, sequences };
  }, [rawOutput]);

  const hasStats = !!stats;

  if (!rawOutput) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {hasStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Packet Loss Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.detail.ping_result.packet_loss}
              </CardTitle>
              {stats.loss === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  stats.loss > 0 ? "text-destructive" : "text-green-500",
                )}
              >
                {stats.loss}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.received} / {stats.transmitted} {t.detail.ping_result.packets_received}
              </p>
            </CardContent>
          </Card>

          {/* Average Latency Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.detail.ping_result.avg_latency}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avg ? `${stats.avg} ms` : t.detail.ping_result.na}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.detail.ping_result.min}: {stats.min || "-"} ms / {t.detail.ping_result.max}:{" "}
                {stats.max || "-"} ms
              </p>
            </CardContent>
          </Card>

          {/* Jitter (mdev) Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.detail.ping_result.jitter}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.mdev ? `${stats.mdev} ms` : t.detail.ping_result.na}
              </div>
              <p className="text-xs text-muted-foreground">{t.detail.ping_result.std_dev}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sequence List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.detail.ping_result.replies}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {sequences.map((seq) => (
                <div
                  key={`${seq.seq}-${seq.ip}`}
                  className="flex items-center justify-between p-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {seq.seq}
                    </Badge>
                    <span className="font-mono text-sm">{seq.ip}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">ttl={seq.ttl}</span>
                    <Badge
                      variant={
                        seq.time < 50 ? "secondary" : seq.time < 150 ? "outline" : "destructive"
                      }
                      className="font-mono"
                    >
                      {seq.time} ms
                    </Badge>
                  </div>
                </div>
              ))}
              {sequences.length === 0 && !hasStats && (
                <div className="p-8 text-center text-muted-foreground">
                  {t.detail.ping_result.waiting}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <RawOutputPanel output={rawOutput} />
    </div>
  );
}

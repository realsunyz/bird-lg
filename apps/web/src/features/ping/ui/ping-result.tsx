import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { RawOutputPanel } from "@/shared/ui/raw-output-panel";
import { useTranslation } from "@/shared/i18n/provider";
import { Slot } from "@/shared/ui/animate-ui/primitives/animate/slot";

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
  ttl?: number;
  time?: number;
  ip: string;
  status: "success" | "timeout";
}

export function PingResult({ rawOutput }: PingResultProps) {
  const { t } = useTranslation();
  const { stats, sequences } = useMemo<{
    stats: PingStats | null;
    sequences: PingSequence[];
  }>(() => {
    const lines = rawOutput.split("\n");
    const sequenceMap = new Map<number, PingSequence>();
    let stats: PingStats | null = null;
    let transmitted = 0;

    const seqRegex =
      /(\d+) bytes from (.+?)(?:\s*:|\s+):?\s*icmp_seq=(\d+) ttl=(\d+) time=([\d.]+) ms/;
    const timeoutRegexes = [
      /no answer yet for icmp_seq=(\d+)/,
      /Request timeout for icmp_seq[=\s](\d+)/,
    ];
    const statsHeaderRegex = /(\d+) packets transmitted, (\d+) received, ([\d.]+)% packet loss/;
    const rttRegex = /rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/;

    lines.forEach((line) => {
      const seqMatch = line.match(seqRegex);
      if (seqMatch) {
        const seq = parseInt(seqMatch[3]);
        sequenceMap.set(seq, {
          ip: seqMatch[2],
          seq,
          ttl: parseInt(seqMatch[4]),
          time: parseFloat(seqMatch[5]),
          status: "success",
        });
        return;
      }

      for (const timeoutRegex of timeoutRegexes) {
        const timeoutMatch = line.match(timeoutRegex);
        if (!timeoutMatch) continue;
        const seq = parseInt(timeoutMatch[1]);
        const existing = sequenceMap.get(seq);
        if (!existing || existing.status !== "success") {
          sequenceMap.set(seq, {
            seq,
            ip: "",
            status: "timeout",
          });
        }
        return;
      }

      const statsMatch = line.match(statsHeaderRegex);
      if (statsMatch) {
        transmitted = parseInt(statsMatch[1]);
        stats = {
          transmitted,
          received: parseInt(statsMatch[2]),
          loss: parseFloat(statsMatch[3]),
          ...stats,
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

    if (transmitted > 0) {
      for (let seq = 1; seq <= transmitted; seq += 1) {
        if (!sequenceMap.has(seq)) {
          sequenceMap.set(seq, {
            seq,
            ip: "",
            status: "timeout",
          });
        }
      }
    }

    const sequences = Array.from(sequenceMap.values()).sort((a, b) => a.seq - b.seq);
    return { stats, sequences };
  }, [rawOutput]);

  const hasStats = !!stats;
  const repliesViewportHeight = Math.min(
    300,
    sequences.length > 0 ? (sequences.length + 1) * 44 : 140,
  );
  const getLatencyClassName = (value?: number) => {
    if (value === undefined) return "font-semibold";
    if (value < 50) return "font-semibold text-green-600";
    if (value < 150) return "font-semibold text-yellow-600";
    return "font-semibold text-destructive";
  };

  if (!rawOutput) return null;

  return (
    <div className="space-y-4 mt-4">
      <Slot
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-none">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-base">{t.detail.ping_result.replies}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea style={{ height: `${repliesViewportHeight}px` }}>
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
                      <span className="font-mono text-sm">
                        {seq.status === "timeout" ? t.detail.ping_result.timeout : seq.ip}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {seq.status === "timeout" ? "ttl=n/a" : `ttl=${seq.ttl}`}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          seq.status === "timeout"
                            ? "font-semibold text-destructive"
                            : getLatencyClassName(seq.time)
                        }
                      >
                        {seq.status === "timeout"
                          ? `${t.detail.ping_result.na} ms`
                          : `${seq.time?.toFixed(2)} ms`}
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
            {hasStats && stats && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t px-6 py-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t.detail.ping_result.packet_loss}</span>
                  <span className={stats.loss > 0 ? "font-semibold text-destructive" : "font-semibold"}>
                    {stats.loss}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t.detail.ping_result.avg_latency}</span>
                  <span className={getLatencyClassName(stats.avg)}>
                    {stats.avg !== undefined ? `${stats.avg.toFixed(2)} ms` : t.detail.ping_result.na}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t.detail.ping_result.jitter}</span>
                  <span className={getLatencyClassName(stats.mdev)}>
                    {stats.mdev !== undefined ? `${stats.mdev.toFixed(2)} ms` : t.detail.ping_result.na}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Slot>

      <RawOutputPanel output={rawOutput} />
    </div>
  );
}

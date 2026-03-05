import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RawOutputPanel } from "@/components/raw-output-panel";
import { useTranslation } from "@/components/i18n-provider";
import { Slot } from "@/components/animate-ui/primitives/animate/slot";

interface TracerouteResultProps {
  rawOutput: string;
}

interface TracerouteHop {
  hop: number;
  host: string;
  ip: string;
  asn?: string;
  rtts: number[];
  status: "success" | "timeout" | "partial";
  raw: string;
}

export function TracerouteResult({ rawOutput }: TracerouteResultProps) {
  const { t } = useTranslation();
  const hops = useMemo<TracerouteHop[]>(() => {
    const lines = rawOutput.split("\n");
    const parsedHops: TracerouteHop[] = [];

    const hopRegex = /^\s*(\d+)\s+(.+)$/;

    lines.forEach((line) => {
      const match = line.match(hopRegex);
      if (!match) return;

      const hopNum = parseInt(match[1]);
      const rest = match[2];

      if (rest.startsWith("*")) {
        parsedHops.push({
          hop: hopNum,
          host: "*",
          ip: "*",
          rtts: [],
          status: "timeout",
          raw: line,
        });
        return;
      }

      const ipMatch = rest.match(/\(([\d.:]+)\)/);
      const asnMatch = rest.match(/\[(AS\d+)\]/i);
      const host = ipMatch ? rest.split("(")[0].trim() : rest.split(/\s+/)[0];
      const ip = ipMatch ? ipMatch[1] : "";

      const rttMatches = rest.matchAll(/([\d.]+)\s+ms/g);
      const rtts: number[] = [];
      for (const m of rttMatches) {
        rtts.push(parseFloat(m[1]));
      }

      parsedHops.push({
        hop: hopNum,
        host: host,
        ip: ip,
        asn: asnMatch ? asnMatch[1] : undefined,
        rtts: rtts,
        status: rtts.length > 0 ? "success" : "timeout",
        raw: line,
      });
    });

    return parsedHops;
  }, [rawOutput]);

  if (!rawOutput) return null;

  return (
    <div className="space-y-4 mt-4">
      <Slot
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] pl-4 sm:pl-6">#</TableHead>
                  <TableHead>{t.detail.traceroute_result.host}</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="pr-4 sm:pr-6">{t.detail.traceroute_result.rtt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hops.map((hop) => (
                  <TableRow key={`${hop.hop}-${hop.ip || hop.host}`} className="font-mono text-sm">
                    <TableCell className="font-medium pl-4 sm:pl-6">{hop.hop}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{hop.host}</span>
                        {hop.asn && (
                          <Badge variant="secondary" className="w-fit text-[10px] h-5 px-1 mt-1">
                            {hop.asn}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{hop.ip}</TableCell>
                    <TableCell className="pr-4 sm:pr-6">
                      <div className="flex gap-2">
                        {hop.status === "timeout" && (
                          <span className="text-muted-foreground">* * *</span>
                        )}
                        {hop.rtts.map((rtt, index) => (
                          <span
                            key={`${hop.hop}-${hop.ip || hop.host}-${index}`}
                            className={
                              rtt < 50
                                ? "text-green-600"
                                : rtt < 150
                                  ? "text-yellow-600"
                                  : "text-destructive"
                            }
                          >
                            {rtt.toFixed(2)}ms
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {hops.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground p-8">
                      {t.detail.traceroute_result.starting}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Slot>

      <RawOutputPanel output={rawOutput} />
    </div>
  );
}


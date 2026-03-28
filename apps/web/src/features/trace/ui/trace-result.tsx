import { useEffect, useMemo, useRef, useState } from "react";
import { DynamicFlag } from "@sankyu/react-circle-flags";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { RawOutputPanel } from "@/shared/ui/raw-output-panel";
import { useTranslation } from "@/shared/i18n/provider";
import { Slot } from "@/shared/ui/animate-ui/primitives/animate/slot";
import { fetchTraceIPInfo, type TraceIPMetadata, isAbortError } from "@/shared/api/tool-client";

interface TraceResultProps {
  rawOutput: string;
}

interface TraceHop {
  hop: number;
  address: string;
  rdns?: string;
  rawAsn?: string;
  rtts: number[];
  status: "success" | "timeout";
  raw: string;
}

const ipLiteralPattern = /^[0-9A-Fa-f:.]+$/;

function isIPAddress(value: string) {
  return value !== "*" && ipLiteralPattern.test(value);
}

export function TraceResult({ rawOutput }: TraceResultProps) {
  const { t } = useTranslation();
  const [traceIPInfo, setTraceIPInfo] = useState<Record<string, TraceIPMetadata>>({});
  const requestedIPsRef = useRef(new Set<string>());
  const inFlightIPsRef = useRef(new Set<string>());
  const hops = useMemo<TraceHop[]>(() => {
    const lines = rawOutput.split("\n");
    const parsedHops: TraceHop[] = [];

    const hopRegex = /^\s*(\d+)\s+(.+)$/;

    lines.forEach((line) => {
      const match = line.match(hopRegex);
      if (!match) return;

      const hopNum = parseInt(match[1]);
      const rest = match[2];

      if (rest.startsWith("*")) {
        parsedHops.push({
          hop: hopNum,
          address: "*",
          rtts: [],
          status: "timeout",
          raw: line,
        });
        return;
      }

      const ipMatch = rest.match(/\(([0-9A-Fa-f:.]+)\)/);
      const asnMatch = rest.match(/\[(AS\d+)\]/i);
      const host = ipMatch ? rest.split("(")[0].trim() : rest.split(/\s+/)[0];
      const ip = ipMatch?.[1] ?? (ipLiteralPattern.test(host) ? host : "");
      const rdns = ip && host && host !== ip ? host : undefined;

      const rttMatches = rest.matchAll(/([\d.]+)\s+ms/g);
      const rtts: number[] = [];
      for (const m of rttMatches) {
        rtts.push(parseFloat(m[1]));
      }

      parsedHops.push({
        hop: hopNum,
        address: ip || host,
        rdns,
        rawAsn: asnMatch?.[1],
        rtts,
        status: rtts.length > 0 ? "success" : "timeout",
        raw: line,
      });
    });

    return parsedHops;
  }, [rawOutput]);
  const uniqueIPs = useMemo(
    () => Array.from(new Set(hops.map((hop) => hop.address).filter(isIPAddress))),
    [hops],
  );

  useEffect(() => {
    const activeIPs = new Set(uniqueIPs);
    requestedIPsRef.current.forEach((ip) => {
      if (!activeIPs.has(ip)) {
        requestedIPsRef.current.delete(ip);
      }
    });
    inFlightIPsRef.current.forEach((ip) => {
      if (!activeIPs.has(ip)) {
        inFlightIPsRef.current.delete(ip);
      }
    });

    setTraceIPInfo((prev) => {
      const nextEntries = Object.entries(prev).filter(([ip]) => uniqueIPs.includes(ip));
      if (nextEntries.length === Object.keys(prev).length) return prev;
      return Object.fromEntries(nextEntries);
    });
  }, [uniqueIPs]);

  useEffect(() => {
    const pendingIPs = uniqueIPs.filter(
      (ip) =>
        !traceIPInfo[ip] &&
        !requestedIPsRef.current.has(ip) &&
        !inFlightIPsRef.current.has(ip),
    );
    if (pendingIPs.length === 0) return;

    let controller: AbortController | null = null;
    const timer = window.setTimeout(() => {
      const batch = uniqueIPs.filter(
        (ip) =>
          !traceIPInfo[ip] &&
          !requestedIPsRef.current.has(ip) &&
          !inFlightIPsRef.current.has(ip),
      );
      if (batch.length === 0) return;

      controller = new AbortController();
      batch.forEach((ip) => inFlightIPsRef.current.add(ip));

      fetchTraceIPInfo(batch, controller.signal)
        .then((items) => {
          if (controller?.signal.aborted) return;
          batch.forEach((ip) => requestedIPsRef.current.add(ip));
          setTraceIPInfo((prev) => ({ ...prev, ...items }));
        })
        .catch((error) => {
          if (controller?.signal.aborted || isAbortError(error)) return;
          if (String(error).includes("ERR-RATE-429")) {
            batch.forEach((ip) => requestedIPsRef.current.add(ip));
            return;
          }
          console.error("Failed to load trace ipinfo", error);
        })
        .finally(() => {
          batch.forEach((ip) => inFlightIPsRef.current.delete(ip));
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [traceIPInfo, uniqueIPs]);

  if (!rawOutput) return null;

  return (
    <div className="space-y-4 mt-4">
      <Slot
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] pl-4 sm:pl-6">#</TableHead>
                  <TableHead>{t.detail.trace_result.address}</TableHead>
                  <TableHead className="sm:hidden">{t.detail.trace_result.info}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.detail.trace_result.country}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.detail.trace_result.asn}</TableHead>
                  <TableHead className="pr-4 sm:pr-6">{t.detail.trace_result.rtt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hops.map((hop) => {
                  const ipinfo = traceIPInfo[hop.address];
                  const countryCode = ipinfo?.countryCode?.toLowerCase();
                  const asn = ipinfo?.asn || hop.rawAsn;

                  return (
                    <TableRow key={`${hop.hop}-${hop.address}`} className="text-sm">
                      <TableCell className="pl-4 font-medium font-mono sm:pl-6">{hop.hop}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-mono">{hop.address}</span>
                          {hop.rdns && (
                            <span className="font-mono text-xs text-muted-foreground">{hop.rdns}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 sm:hidden">
                        {(countryCode && countryCode.length === 2) || asn ? (
                          <div className="flex items-center gap-2 text-foreground">
                            {countryCode && countryCode.length === 2 && (
                              <DynamicFlag code={countryCode} className="size-4 shrink-0 rounded-full overflow-hidden" />
                            )}
                            {asn ? (
                              <span className="font-mono text-muted-foreground">{asn}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden py-3 sm:table-cell">
                        {(countryCode && countryCode.length === 2) || ipinfo?.country ? (
                          <div className="flex items-center gap-2 text-foreground">
                            {countryCode && countryCode.length === 2 && (
                              <DynamicFlag code={countryCode} className="size-4 shrink-0 rounded-full overflow-hidden" />
                            )}
                            <span className="whitespace-normal break-words">{ipinfo?.country || ipinfo?.countryCode}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden py-3 sm:table-cell">
                        {asn ? (
                          <div className="flex items-center gap-2 text-foreground">
                            <span className="font-mono text-muted-foreground">{asn}</span>
                            {ipinfo?.asName && (
                              <span className="whitespace-normal break-words">
                                {ipinfo.asName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 sm:pr-6">
                        <div className="flex gap-2 font-mono">
                          {hop.status === "timeout" && (
                            <span className="text-muted-foreground">* * *</span>
                          )}
                          {hop.rtts.map((rtt, index) => (
                            <span
                              key={`${hop.hop}-${hop.address}-${index}`}
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
                  );
                })}
                {hops.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="hidden p-8 text-center text-muted-foreground sm:table-cell">
                      {t.detail.trace_result.starting}
                    </TableCell>
                    <TableCell colSpan={4} className="p-8 text-center text-muted-foreground sm:hidden">
                      {t.detail.trace_result.starting}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Slot>

      <RawOutputPanel output={rawOutput} />
      <p className="text-xs text-muted-foreground">
        Credit: IP address information is provided by{" "}
        <a
          href="https://ipinfo.io"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          IPInfo
        </a>
        .
      </p>
    </div>
  );
}

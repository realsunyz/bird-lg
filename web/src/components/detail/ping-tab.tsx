import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PingResult } from "@/components/detail/ping-result";
import { useTranslation } from "@/components/i18n-provider";
import { validateTargetInput } from "@/lib/target-validation";
import { useBufferedText } from "@/hooks/use-buffered-text";
import { useMediaQuery } from "@/hooks/use-media-query";
import { QueryErrorAlert } from "@/components/detail/query-error-alert";
import { getToolErrorMessage, isAbortError, runStreamRequest } from "@/components/detail/tool-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const toolInputClass = "flex-1 font-mono text-base md:text-sm";

export function PingTab({
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
  const streamText = useBufferedText();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const abortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState("");

  const handlePing = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const validation = validateTargetInput(target);
    if (!validation.ok) {
      setError(validation.errorKey);
      return;
    }

    const normalizedTarget = validation.normalized;
    setLoading(true);
    streamText.reset();
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
        signal: abortRef.current.signal,
        onUnauthorized: () => onUnauthorized(handlePing),
        onData: (line) => {
          if (line.startsWith("ERR-")) {
            setError(getToolErrorMessage(line));
            abortRef.current?.abort();
            return;
          }
          streamText.append(line);
        },
      });
    } catch (e) {
      if (!isAbortError(e)) {
        setError(getToolErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder={isMobile ? t.detail.ping_placeholder_mobile : t.detail.ping_placeholder}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && target.trim().length > 0 && !loading && handlePing()}
          className={toolInputClass}
        />
        <div className="hidden sm:block">
          <Select value={count} onValueChange={setCount}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={t.detail.ping_count} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">
                1 {t.detail.ping_packets}
              </SelectItem>
              <SelectItem value="2">
                2 {t.detail.ping_packets}
              </SelectItem>
              <SelectItem value="4">
                4 {t.detail.ping_packets}
              </SelectItem>
              <SelectItem value="8">
                8 {t.detail.ping_packets}
              </SelectItem>
              {isSSO && (
                <>
                  <SelectItem value="10">
                    10 {t.detail.ping_packets}
                  </SelectItem>
                  <SelectItem value="20">
                    20 {t.detail.ping_packets}
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handlePing} disabled={loading || target.trim().length === 0}>
          {loading ? <Spinner /> : t.detail.execute}
        </Button>
      </div>
      <QueryErrorAlert message={error} />
      {streamText.text && !error && <PingResult rawOutput={streamText.text} />}
    </div>
  );
}

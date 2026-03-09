import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TracerouteResult } from "@/components/detail/traceroute-result";
import { useTranslation } from "@/components/i18n-provider";
import { validateTargetInput } from "@/lib/target-validation";
import { useBufferedText } from "@/hooks/use-buffered-text";
import { useMediaQuery } from "@/hooks/use-media-query";
import { QueryErrorAlert } from "@/components/detail/query-error-alert";
import { getToolErrorMessage, isAbortError, runStreamRequest } from "@/components/detail/tool-client";

const toolInputClass = "flex-1 font-mono text-base md:text-sm";

export function TracerouteTab({
  activeServer,
  onUnauthorized,
}: {
  activeServer: string;
  onUnauthorized: (retry: () => void) => void;
}) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const streamText = useBufferedText();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const abortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState("");

  const handleTraceroute = async () => {
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
      const params = new URLSearchParams({
        server: activeServer,
        target: normalizedTarget,
      });
      await runStreamRequest({
        url: `/api/tool/traceroute/stream?${params.toString()}`,
        body: { target: normalizedTarget },
        startError: t.detail.traceroute_start_failed,
        signal: abortRef.current.signal,
        onUnauthorized: () => onUnauthorized(handleTraceroute),
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
          placeholder={isMobile ? t.detail.traceroute_placeholder_mobile : t.detail.traceroute_placeholder}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && target.trim().length > 0 && !loading && handleTraceroute()}
          className={toolInputClass}
        />
        <Button onClick={handleTraceroute} disabled={loading || target.trim().length === 0}>
          {loading ? <Spinner /> : t.detail.execute}
        </Button>
      </div>
      <QueryErrorAlert message={error} />
      {streamText.text && !error && <TracerouteResult rawOutput={streamText.text} />}
    </div>
  );
}

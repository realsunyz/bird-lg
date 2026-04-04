import { useEffect, useRef, useState } from "react";

import { buildPostJSONHeaders } from "@/shared/lib/csrf";
import { getToolErrorMessage, isAbortError } from "@/shared/api/tool-client";

export function useBirdRouteQuery(
  serverId: string,
  onUnauthorized: () => void,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [lastCommand, setLastCommand] = useState("");
  const [routePreset, setRoutePreset] = useState("show protocols");
  const [routeInput, setRouteInput] = useState("");
  const birdRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      const birdRequest = birdRequestRef.current;
      birdRequestRef.current = null;
      birdRequest?.abort();
    };
  }, []);

  const runBirdQuery = async (command: string) => {
    const previousRequest = birdRequestRef.current;
    birdRequestRef.current = null;
    previousRequest?.abort();

    const controller = new AbortController();
    birdRequestRef.current = controller;
    setLoading(true);
    setError("");
    setResult(null);
    setLastCommand(command);

    try {
      const response = await fetch("/api/bird", {
        method: "POST",
        headers: buildPostJSONHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          type: "bird",
          server: serverId,
          command: command.trim(),
        }),
      });

      if (birdRequestRef.current !== controller || controller.signal.aborted) {
        return;
      }

      if (response.status === 401 || response.status === 403) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      if (birdRequestRef.current !== controller || controller.signal.aborted) {
        return;
      }

      if (data.rateLimit) {
        setError("rate_limit_exceeded");
        return;
      }

      if (data.error) {
        setError(getToolErrorMessage(data.error));
        return;
      }

      setResult(data);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setError(getToolErrorMessage(error));
    } finally {
      if (birdRequestRef.current === controller) {
        birdRequestRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleProtocolSelect = (name: string) => {
    setRoutePreset("show protocols");
    setRouteInput(name);
    void runBirdQuery(`show protocols all ${name}`);
  };

  const setRoutePresetAndReset = (value: string) => {
    setRoutePreset(value);
    setResult(null);
    setError("");
  };

  return {
    loading,
    error,
    result,
    lastCommand,
    routePreset,
    setRoutePreset: setRoutePresetAndReset,
    routeInput,
    setRouteInput,
    runBirdQuery,
    handleProtocolSelect,
  };
}

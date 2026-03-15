import { useEffect, useRef, useState } from "react";
import { appBuildInfo } from "@/shared/lib/build-info";

const CHECK_INTERVAL_MS = 1000;
const BLOCK_THRESHOLD_MS = 150;

export function useDebuggerGuard() {
  const [isBlocked, setIsBlocked] = useState(false);
  const isBlockedRef = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV || appBuildInfo.version === "dev") {
      return;
    }

    const checkDebugger = () => {
      const startedAt = performance.now();

      debugger;

      if (
        performance.now() - startedAt > BLOCK_THRESHOLD_MS &&
        !isBlockedRef.current
      ) {
        isBlockedRef.current = true;
        setIsBlocked(true);
      }
    };

    checkDebugger();
    const timer = window.setInterval(checkDebugger, CHECK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return isBlocked;
}

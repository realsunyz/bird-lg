"use client";

import * as React from "react";

type BufferedTextOptions = {
  flushWithRaf?: boolean;
  newline?: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.requestAnimationFrame === "function";
}

export function useBufferedText(options: BufferedTextOptions = {}) {
  const { flushWithRaf = true, newline = "\n" } = options;

  const [text, setText] = React.useState("");
  const bufferRef = React.useRef("");
  const rafRef = React.useRef<number | null>(null);

  const flush = React.useCallback(() => {
    setText(bufferRef.current);
  }, []);

  const scheduleFlush = React.useCallback(() => {
    if (!flushWithRaf || !isBrowser()) {
      flush();
      return;
    }
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      flush();
    });
  }, [flush, flushWithRaf]);

  const reset = React.useCallback(() => {
    bufferRef.current = "";
    if (rafRef.current !== null && isBrowser()) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setText("");
  }, []);

  const append = React.useCallback(
    (chunk: string) => {
      if (!chunk) return;
      if (newline && !chunk.endsWith(newline)) {
        bufferRef.current += chunk + newline;
      } else {
        bufferRef.current += chunk;
      }
      scheduleFlush();
    },
    [newline, scheduleFlush],
  );

  React.useEffect(() => {
    return () => {
      if (rafRef.current !== null && isBrowser()) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return { text, reset, append, flush } as const;
}

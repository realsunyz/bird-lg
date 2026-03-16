import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@/shared/i18n/provider";
import { useTheme } from "@/shared/ui/theme-provider";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { cn } from "@/shared/lib/utils";

let highlighterInstance: any = null;

const getHighlighter = async () => {
  if (highlighterInstance) return highlighterInstance;
  highlighterInstance = await createHighlighterCore({
    themes: [
      import("shiki/themes/github-light.mjs"),
      import("shiki/themes/github-dark.mjs"),
    ],
    langs: [import("shiki/langs/shell.mjs")],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterInstance;
};

function sanitizeHighlightedHtml(input: string): string {
  if (!input) return "";
  if (typeof document === "undefined") return "";

  const template = document.createElement("template");
  template.innerHTML = input;

  const allowedTags = new Set(["PRE", "CODE", "SPAN", "BR"]);
  const allowedAttrs = new Set(["class", "style"]);
  const allowedStyleProps = new Set(["color", "background-color", "font-style", "font-weight"]);

  const sanitizeStyle = (raw: string) => {
    const parts = raw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    const kept: string[] = [];
    for (const part of parts) {
      const idx = part.indexOf(":");
      if (idx <= 0) continue;
      const prop = part.slice(0, idx).trim().toLowerCase();
      const value = part.slice(idx + 1).trim();
      if (!allowedStyleProps.has(prop)) continue;
      const lower = value.toLowerCase();
      if (lower.includes("url(") || lower.includes("expression(") || lower.includes("javascript:")) {
        continue;
      }
      kept.push(`${prop}: ${value}`);
    }
    return kept.join("; ");
  };

  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      if (!allowedTags.has(el.tagName)) {
        const text = document.createTextNode(el.textContent || "");
        el.replaceWith(text);
        return;
      }

      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (!allowedAttrs.has(name)) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name === "style") {
          const sanitized = sanitizeStyle(attr.value);
          if (sanitized) el.setAttribute("style", sanitized);
          else el.removeAttribute("style");
        }
      }
    }

    for (const child of Array.from(node.childNodes)) {
      sanitizeNode(child);
    }
  };

  sanitizeNode(template.content);
  return template.innerHTML;
}

interface RawOutputPanelProps {
  output: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

export function RawOutputPanel({ output, defaultOpen = false, collapsible = true }: RawOutputPanelProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [showRaw, setShowRaw] = useState(collapsible ? defaultOpen : true);
  const [html, setHtml] = useState("");
  const safeHtml = useMemo(() => sanitizeHighlightedHtml(html), [html]);

  useEffect(() => {
    if (!showRaw || !output) return;

    const resolveTheme = () => {
      if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "github-dark"
          : "github-light";
      }
      return theme === "dark" ? "github-dark" : "github-light";
    };

    getHighlighter()
      .then((highlighter) => {
        setHtml(
          highlighter.codeToHtml(output, {
            lang: "shell",
            theme: resolveTheme(),
          })
        );
      })
      .catch((e) => {
        console.error("Failed to highlight code", e);
        setHtml("");
      });
  }, [showRaw, output, theme]);

  return (
    <div
      className={cn(
        collapsible && "overflow-hidden rounded-xl border bg-card text-card-foreground",
      )}
    >
      {collapsible && (
        <button
          type="button"
          className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-accent/30"
          onClick={() => setShowRaw(!showRaw)}
        >
          <span className="text-base font-normal tracking-tight">
            {t.detail.raw_output}
          </span>
          {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}
      {showRaw && (
        <div
          className={`bg-muted/30 overflow-x-auto text-sm font-mono [&_pre]:bg-transparent! [&_pre]:m-0! ${
            collapsible ? "border-t px-6 py-4" : "rounded-md border p-4"
          }`}
        >
          {safeHtml ? (
            <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
          ) : (
            <pre className="whitespace-pre-wrap">{output}</pre>
          )}
        </div>
      )}
    </div>
  );
}

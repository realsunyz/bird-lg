import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n-provider";
import { useTheme } from "@/components/theme-provider";
import { codeToHtml } from "shiki";

interface RawOutputPanelProps {
  output: string;
}

export function RawOutputPanel({ output }: RawOutputPanelProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [showRaw, setShowRaw] = useState(false);
  const [html, setHtml] = useState("");

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

    codeToHtml(output, {
      lang: "shell",
      theme: resolveTheme(),
    })
      .then(setHtml)
      .catch((e) => {
        console.error("Failed to highlight code", e);
        setHtml("");
      });
  }, [showRaw, output, theme]);

  return (
    <div className="border rounded-md">
      <Button
        variant="ghost"
        className="w-full flex justify-between items-center p-4 h-auto"
        onClick={() => setShowRaw(!showRaw)}
      >
        <span className="font-medium">{t.detail.raw_output}</span>
        {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {showRaw && (
        <div className="p-4 bg-muted/30 border-t overflow-x-auto text-sm font-mono [&_pre]:bg-transparent! [&_pre]:m-0!">
          {html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <pre className="whitespace-pre-wrap">{output}</pre>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n-provider";

interface RawOutputPanelProps {
  output: string;
}

export function RawOutputPanel({ output }: RawOutputPanelProps) {
  const { t } = useTranslation();
  const [showRaw, setShowRaw] = useState(false);

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
          <pre className="whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}

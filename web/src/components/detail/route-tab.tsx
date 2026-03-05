import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryErrorAlert } from "@/components/detail/query-error-alert";
import { RawOutputPanel } from "@/components/raw-output-panel";
import { useTranslation } from "@/components/i18n-provider";
import { isIP } from "@/lib/target-validation";
import { cn } from "@/lib/utils";

interface ProtocolInfo {
  name: string;
  proto: string;
  table: string;
  state: string;
  since: string;
  info: string;
}

export interface RouteTabProps {
  runBirdQuery: (command: string) => Promise<void>;
  loading: boolean;
  result: unknown;
  error: string;
  lastCommand: string;
  preset: string;
  setPreset: (v: string) => void;
  input: string;
  setInput: (v: string) => void;
  onProtocolSelect: (v: string) => void;
}

export function RouteTab({
  runBirdQuery,
  loading,
  result,
  error,
  lastCommand,
  preset,
  setPreset,
  input,
  setInput,
  onProtocolSelect,
}: RouteTabProps) {
  const { t } = useTranslation();

  const handleSubmit = () => {
    if (preset === "show protocols") {
      if (!input.trim()) {
        runBirdQuery("show protocols");
      } else {
        runBirdQuery(`show protocols all ${input}`.trim());
      }
    } else if (preset === "custom") {
      runBirdQuery(input.trim());
    } else {
      runBirdQuery(`${preset} ${input}`.trim());
    }
  };

  const routeDataRaw = (result as { result?: { data: unknown }[] })?.result?.[0]?.data;
  const routeData = typeof routeDataRaw === "string" ? routeDataRaw : "";
  const isShowAllProtocols = lastCommand === "show protocols";
  const protocols = isShowAllProtocols ? parseProtocolSummary(routeData) : [];
  const filteredProtocols = protocols.filter((p) => {
    const proto = typeof p?.proto === "string" ? p.proto : "";
    return !["static", "device", "direct", "kernel"].includes(proto.toLowerCase());
  });

  const isExecuteDisabled =
    loading ||
    (preset === "show route for" && !isIP(input.trim())) ||
    (preset === "custom" && input.trim().length === 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="show protocols">show protocols</SelectItem>
            <SelectItem value="show route for">show route for</SelectItem>
            <SelectItem value="custom">custom</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isExecuteDisabled && handleSubmit()}
          className="w-full sm:flex-1 font-mono text-base md:text-sm"
        />
        <Button onClick={handleSubmit} disabled={isExecuteDisabled}>
          {loading ? <Spinner /> : t.detail.execute}
        </Button>
      </div>
      <QueryErrorAlert message={error} />

      {isShowAllProtocols && !loading && !error && filteredProtocols.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.detail.table.name}</TableHead>
                <TableHead>{t.detail.table.proto}</TableHead>
                <TableHead>{t.detail.table.state}</TableHead>
                <TableHead>{t.detail.table.since}</TableHead>
                <TableHead>{t.detail.table.info}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProtocols.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium text-sm">
                    <button
                      onClick={() => onProtocolSelect(p.name)}
                      className="hover:underline cursor-pointer text-primary focus:outline-none"
                    >
                      {p.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">{p.proto}</TableCell>
                  <TableCell>
                    <span className={cn("text-sm font-semibold", getStateColor(p.state))}>
                      {p.state}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {p.since}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.info}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(!isShowAllProtocols || filteredProtocols.length === 0) && routeData && !loading && !error && (
        <RawOutputPanel output={routeData} collapsible={false} />
      )}
    </div>
  );
}

function parseProtocolSummary(output: string): ProtocolInfo[] {
  const lines = output.split("\n");
  const result: ProtocolInfo[] = [];
  let headerSkipped = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!headerSkipped && line.startsWith("Name")) {
      headerSkipped = true;
      continue;
    }

    const fields = splitFields(line);
    if (fields.length < 5) continue;

    result.push({
      name: fields[0],
      proto: fields[1],
      table: fields[2],
      state: fields[3],
      since: fields[4],
      info: fields.length > 5 ? fields.slice(5).join(" ") : "",
    });
  }

  return result;
}

function splitFields(value: string): string[] {
  const fields: string[] = [];
  let start = -1;

  for (let index = 0; index < value.length; index++) {
    const ch = value[index];
    const isSpace = ch === " " || ch === "\t";
    if (!isSpace && start === -1) {
      start = index;
      continue;
    }
    if (isSpace && start !== -1) {
      fields.push(value.slice(start, index));
      start = -1;
    }
  }

  if (start !== -1) {
    fields.push(value.slice(start));
  }

  return fields;
}

function getStateColor(state: string): string {
  const lower = state.toLowerCase();
  if (lower.includes("established") || lower === "up") return "text-green-600";
  if (lower.includes("start") || lower.includes("connect")) return "text-yellow-600";
  if (lower.includes("down") || lower.includes("idle")) return "text-red-500";
  return "text-muted-foreground";
}

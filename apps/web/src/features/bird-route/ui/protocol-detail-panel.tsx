import { ChevronUp } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import type { BgpProtocolDetail, RouteStats } from "../lib/parse-protocol-detail";
import { cn } from "@/shared/lib/utils";

interface ProtocolDetailPanelProps {
  detail: BgpProtocolDetail;
  onClose?: () => void;
}

export function ProtocolDetailPanel({ detail, onClose }: ProtocolDetailPanelProps) {
  const isEstablished = detail.state.toLowerCase() === "established" || detail.state.toLowerCase() === "up";

  return (
    <div className="rounded-xl border bg-card text-card-foreground w-full mx-auto font-sans">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight">{detail.name}</h2>
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent text-xs px-2 py-0.5 font-semibold",
                  isEstablished
                    ? "bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400"
                    : "bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400"
                )}
              >
                {detail.state}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {detail.channel} {detail.description ? `- ${detail.description}` : ""}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Primary Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 py-6 border-b border-t mt-4 border-border/50">
          <DetailItem label="Neighbor IP" value={detail.neighborIp} />
          <DetailItem label="Neighbor AS" value={detail.neighborAs} />
          <DetailItem label="Routes Imported" value={detail.routesImported} />
          <DetailItem label="Routes Exported" value={detail.routesExported} />

          <DetailItem label="Source IP" value={detail.sourceIp} />
          <DetailItem label="Neighbor ID" value={detail.neighborId} />
          <DetailItem label="Routes Preferred" value={detail.routesPreferred} />
          <DetailItem
            label="Routes Filtered"
            value={detail.routesFiltered}
            valueClassName={parseInt(detail.routesFiltered) > 0 ? "text-orange-500 dark:text-orange-400" : ""}
          />

          <DetailItem label="Name" value={detail.description} />
          <DetailItem label="Type" value={detail.infoType} />
          <DetailItem label="Keepalive" value={detail.keepaliveTimer} />
          <DetailItem label="Hold Timer" value={detail.holdTimer} />
        </div>

        {/* Stats Section */}
        <div className="space-y-6 pt-6">
          {detail.importUpdates && (
            <StatsRow title="Import Updates" stats={detail.importUpdates} />
          )}
          {detail.importWithdraws && (
            <StatsRow title="Import Withdraws" stats={detail.importWithdraws} />
          )}
          {detail.exportUpdates && (
            <StatsRow title="Export Updates" stats={detail.exportUpdates} />
          )}
          {detail.exportWithdraws && (
            <StatsRow title="Export Withdraws" stats={detail.exportWithdraws} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value?: string;
  valueClassName?: string;
}) {
  const displayValue = value || "-";
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span
        title={displayValue}
        className={cn("text-sm font-medium font-mono truncate", valueClassName)}
      >
        {displayValue}
      </span>
    </div>
  );
}

function StatsRow({ title, stats }: { title: string; stats: RouteStats }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Received" value={stats.received} />
        <StatCard label="Rejected" value={stats.rejected} />
        <StatCard label="Filtered" value={stats.filtered} />
        <StatCard label="Ignored" value={stats.ignored} />
        <StatCard label="Accepted" value={stats.accepted} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 flex flex-col gap-1.5 border border-transparent hover:border-border transition-colors">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-base font-semibold font-mono tracking-tight">{value}</span>
    </div>
  );
}

export interface RouteStats {
  received: string;
  rejected: string;
  filtered: string;
  ignored: string;
  accepted: string;
}

export interface BgpProtocolDetail {
  name: string;
  state: string;
  description: string;
  neighborIp: string;
  neighborAs: string;
  neighborId: string;
  sourceIp: string;
  channel: string;
  table: string;
  routesImported: string;
  routesExported: string;
  routesPreferred: string;
  routesFiltered: string;
  keepaliveTimer: string;
  holdTimer: string;
  infoType: string;

  importUpdates?: RouteStats;
  importWithdraws?: RouteStats;
  exportUpdates?: RouteStats;
  exportWithdraws?: RouteStats;
}

function extractValue(lines: string[], prefix: string): string {
  for (const line of lines) {
    if (line.trim().startsWith(prefix)) {
      return line.substring(line.indexOf(prefix) + prefix.length).trim();
    }
  }
  return "";
}

function extractStats(lines: string[], prefix: string): RouteStats | undefined {
  for (const line of lines) {
    if (line.trim().startsWith(prefix)) {
      const parts = line
        .substring(line.indexOf(prefix) + prefix.length)
        .trim()
        .split(/\s+/);
      if (parts.length >= 5) {
        return {
          received: parts[0],
          rejected: parts[1],
          filtered: parts[2],
          ignored: parts[3],
          accepted: parts[4],
        };
      }
    }
  }
  return undefined;
}

function formatNumberString(numStr: string): string {
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return numStr;

  if (num >= 1000000) {
    return (num / 1000000).toFixed(3).replace(/\.000$/, "") + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(3).replace(/\.000$/, "") + "K";
  }
  return num.toString();
}

export function parseBgpProtocolDetail(
  output: string,
): BgpProtocolDetail | null {
  if (!output || typeof output !== "string") return null;

  let lines = output
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  if (lines[0].trim().startsWith("Name") && lines[0].includes("Proto")) {
    lines = lines.slice(1);
  }

  if (lines.length < 1) return null;

  const firstLine = lines[0].trim();
  const firstLineParts = firstLine.split(/\s+/);

  // We only parse BGP protocols for this detailed view
  if (firstLineParts.length < 2 || firstLineParts[1] !== "BGP") {
    return null;
  }

  const name = firstLineParts[0];
  const state =
    extractValue(lines, "BGP state:") ||
    firstLineParts[firstLineParts.length - 1] ||
    "Unknown";
  const description = extractValue(lines, "Description:");
  const neighborIp = extractValue(lines, "Neighbor address:");
  const neighborAs = extractValue(lines, "Neighbor AS:");
  const neighborId = extractValue(lines, "Neighbor ID:");
  const sourceIp = extractValue(lines, "Source address:");
  const keepaliveTimer = extractValue(lines, "Keepalive timer:");
  const holdTimer = extractValue(lines, "Hold timer:");
  let table = extractValue(lines, "Table:");
  if (
    !table &&
    firstLineParts.length > 2 &&
    firstLineParts[2] !== "up" &&
    firstLineParts[2] !== "down"
  ) {
    table = firstLineParts[2];
  }

  let channel = "Unknown";
  for (const line of lines) {
    if (line.trim().startsWith("Channel ")) {
      channel = line.trim().substring("Channel ".length).trim();
      break;
    }
  }

  let infoType = "internal/external";
  if (firstLine.includes("External") || firstLine.includes("Internal")) {
    // sometimes type is buried in options
  }

  // Parse Routes line: Routes: 84 imported, 8 exported, 25 preferred
  let routesImported = "0";
  let routesExported = "0";
  let routesPreferred = "0";
  let routesFiltered = "0";

  const routesLine = extractValue(lines, "Routes:");
  if (routesLine) {
    const parts = routesLine.split(",");
    for (const part of parts) {
      const p = part.trim();
      if (p.includes("imported")) routesImported = p.split(/\s+/)[0];
      if (p.includes("exported")) routesExported = p.split(/\s+/)[0];
      if (p.includes("preferred")) routesPreferred = p.split(/\s+/)[0];
      if (p.includes("filtered")) routesFiltered = p.split(/\s+/)[0];
    }
  }

  const formatStats = (stats?: RouteStats) => {
    if (!stats) return undefined;
    return {
      received: formatNumberString(stats.received),
      rejected: formatNumberString(stats.rejected),
      filtered: formatNumberString(stats.filtered),
      ignored: formatNumberString(stats.ignored),
      accepted: formatNumberString(stats.accepted),
    };
  };

  const importUpdates = formatStats(extractStats(lines, "Import updates:"));
  const importWithdraws = formatStats(extractStats(lines, "Import withdraws:"));
  const exportUpdates = formatStats(extractStats(lines, "Export updates:"));
  const exportWithdraws = formatStats(extractStats(lines, "Export withdraws:"));

  // Try to find the BGP type (e.g., External AS4) if it exists, sometimes seen as "Neighbor AS: 12345" mapped to External
  if (neighborAs) {
    infoType = `External AS${neighborAs.length > 4 ? "4" : "2"}`;
  }

  return {
    name,
    state,
    description,
    neighborIp,
    neighborAs: neighborAs ? `AS${neighborAs}` : "",
    neighborId,
    sourceIp,
    channel,
    table,
    routesImported,
    routesExported,
    routesPreferred,
    routesFiltered,
    keepaliveTimer,
    holdTimer,
    infoType,
    importUpdates,
    importWithdraws,
    exportUpdates,
    exportWithdraws,
  };
}

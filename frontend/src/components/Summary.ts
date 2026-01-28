import { SummaryRowData } from "../api";

export function renderSummaryTable(data: SummaryRowData[]): string {
  if (data.length === 0) {
    return `
      <div class="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>No protocols found</span>
      </div>
    `;
  }

  const rows = data
    .map((row) => {
      const stateClass = getStateClass(row.state, row.info);
      const statusBadge = getStatusBadge(row.state, row.info);

      return `
      <tr class="hover">
        <td class="font-mono font-semibold">${escapeHtml(row.name)}</td>
        <td>
          <span class="badge badge-outline">${escapeHtml(row.proto)}</span>
        </td>
        <td class="font-mono text-sm">${escapeHtml(row.table)}</td>
        <td>${statusBadge}</td>
        <td class="text-sm opacity-70">${escapeHtml(row.since)}</td>
        <td class="text-sm ${stateClass}">${escapeHtml(row.info)}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div class="overflow-x-auto">
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>Name</th>
            <th>Protocol</th>
            <th>Table</th>
            <th>State</th>
            <th>Since</th>
            <th>Info</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function getStateClass(state: string, info: string): string {
  if (info.includes("Established")) {
    return "text-success";
  } else if (state === "up") {
    return "text-success";
  } else if (state === "start") {
    return "text-warning";
  } else if (state === "down") {
    return "text-error";
  }
  return "";
}

function getStatusBadge(state: string, info: string): string {
  if (info.includes("Established")) {
    return '<span class="badge badge-success gap-1"><span class="w-2 h-2 rounded-full bg-success-content animate-pulse"></span>Established</span>';
  } else if (state === "up") {
    return '<span class="badge badge-success">Up</span>';
  } else if (state === "start") {
    return '<span class="badge badge-warning">Starting</span>';
  } else if (state === "down") {
    return '<span class="badge badge-error">Down</span>';
  }
  return `<span class="badge badge-ghost">${escapeHtml(state)}</span>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

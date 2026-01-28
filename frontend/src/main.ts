import "./style.css";
import {
  fetchSummary,
  fetchBirdCommand,
  fetchTraceroute,
  fetchWhois,
  fetchServerList,
  setPrivateKey,
} from "./api";
import { renderSummaryTable } from "./components/Summary";
import { renderRouteQuery, renderRouteResult } from "./components/RouteQuery";
import {
  renderTraceroute,
  renderTracerouteResult,
} from "./components/Traceroute";
import { renderWhois, renderWhoisResult } from "./components/Whois";

// State
let currentTab = "summary";
let selectedServers: string[] = [];
let allServers: string[] = [];

// DOM Elements
const tabContent = document.getElementById("tab-content")!;
const themeToggle = document.getElementById("theme-toggle") as HTMLInputElement;
const serverList = document.getElementById("server-list")!;
const selectedServerEl = document.getElementById("selected-server")!;

// Initialize
async function init() {
  // Check for saved theme
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeToggle.checked = savedTheme === "sunset";

  // Check for private key in localStorage
  const privateKey = localStorage.getItem("ecdsa-private-key");
  if (privateKey) {
    try {
      await setPrivateKey(privateKey);
      console.log("ECDSA signing enabled");
    } catch (e) {
      console.warn("Failed to load private key:", e);
    }
  }

  // Load servers
  await loadServers();

  // Setup event listeners
  setupEventListeners();

  // Load initial tab
  await loadTab("summary");
}

async function loadServers() {
  try {
    const response = await fetchServerList();
    if (response.error) {
      console.error("Failed to load servers:", response.error);
      return;
    }

    allServers = response.result.map((r) => r.server);
    updateServerList();
  } catch (e) {
    console.error("Failed to load servers:", e);
    // Use default
    allServers = ["local"];
    updateServerList();
  }
}

function updateServerList() {
  const items = [
    '<li><a class="active" data-server="all">All Servers</a></li>',
    ...allServers.map(
      (s) => `<li><a data-server="${escapeHtml(s)}">${escapeHtml(s)}</a></li>`,
    ),
  ];
  serverList.innerHTML = items.join("");

  // Re-attach click handlers
  serverList.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const server = (a as HTMLElement).dataset.server!;

      // Update selection
      serverList
        .querySelectorAll("a")
        .forEach((el) => el.classList.remove("active"));
      a.classList.add("active");

      if (server === "all") {
        selectedServers = [];
        selectedServerEl.textContent = "All Servers";
      } else {
        selectedServers = [server];
        selectedServerEl.textContent = server;
      }

      // Reload current tab
      loadTab(currentTab);
    });
  });
}

function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener("change", () => {
    const theme = themeToggle.checked ? "sunset" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  });

  // Tab navigation
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = (tab as HTMLElement).dataset.tab!;

      // Update active state
      document
        .querySelectorAll('[role="tab"]')
        .forEach((t) => t.classList.remove("tab-active"));
      tab.classList.add("tab-active");

      loadTab(tabName);
    });
  });
}

async function loadTab(tabName: string) {
  currentTab = tabName;

  switch (tabName) {
    case "summary":
      await loadSummary();
      break;
    case "route":
      loadRouteQuery();
      break;
    case "traceroute":
      loadTraceroute();
      break;
    case "whois":
      loadWhoisTab();
      break;
  }
}

async function loadSummary() {
  tabContent.innerHTML = `
    <div class="flex items-center justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
      <span class="ml-4">Loading protocols...</span>
    </div>
  `;

  try {
    const servers = selectedServers.length > 0 ? selectedServers : allServers;
    const response = await fetchSummary(servers);

    if (response.error) {
      tabContent.innerHTML = `
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>${escapeHtml(response.error)}</span>
        </div>
      `;
      return;
    }

    const results = response.result
      .map(
        (r) => `
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
          ${escapeHtml(r.server)}
        </h2>
        ${renderSummaryTable(r.data)}
      </div>
    `,
      )
      .join("");

    tabContent.innerHTML =
      results ||
      '<div class="text-center py-8 opacity-50">No data available</div>';
  } catch (e) {
    tabContent.innerHTML = `
      <div class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Failed to load summary: ${escapeHtml(String(e))}</span>
      </div>
    `;
  }
}

function loadRouteQuery() {
  tabContent.innerHTML = renderRouteQuery();

  const input = document.getElementById("route-input") as HTMLInputElement;
  const preset = document.getElementById("route-preset") as HTMLSelectElement;
  const submit = document.getElementById("route-submit")!;
  const result = document.getElementById("route-result")!;

  // Preset selection
  preset.addEventListener("change", () => {
    if (preset.value) {
      input.value = preset.value;
      input.focus();
    }
  });

  // Submit handler
  const doSubmit = async () => {
    const command = input.value.trim();
    if (!command) return;

    result.classList.remove("hidden");
    result.innerHTML = `
      <div class="flex items-center justify-center py-4">
        <span class="loading loading-spinner"></span>
        <span class="ml-2">Executing command...</span>
      </div>
    `;

    try {
      const servers = selectedServers.length > 0 ? selectedServers : allServers;
      const response = await fetchBirdCommand(servers, command);

      if (response.error) {
        result.innerHTML = renderRouteResult("", "", response.error);
        return;
      }

      result.innerHTML = response.result
        .map((r) => renderRouteResult(r.server, r.data))
        .join("");
    } catch (e) {
      result.innerHTML = renderRouteResult("", "", String(e));
    }
  };

  submit.addEventListener("click", doSubmit);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") doSubmit();
  });
}

function loadTraceroute() {
  tabContent.innerHTML = renderTraceroute();

  const input = document.getElementById("traceroute-input") as HTMLInputElement;
  const submit = document.getElementById("traceroute-submit")!;
  const result = document.getElementById("traceroute-result")!;

  const doSubmit = async () => {
    const target = input.value.trim();
    if (!target) return;

    result.classList.remove("hidden");
    result.innerHTML = `
      <div class="flex items-center justify-center py-4">
        <span class="loading loading-spinner"></span>
        <span class="ml-2">Running traceroute...</span>
      </div>
    `;

    try {
      const servers = selectedServers.length > 0 ? selectedServers : allServers;
      const response = await fetchTraceroute(servers, target);

      if (response.error) {
        result.innerHTML = renderTracerouteResult("", "", response.error);
        return;
      }

      result.innerHTML = response.result
        .map((r) => renderTracerouteResult(r.server, r.data))
        .join("");
    } catch (e) {
      result.innerHTML = renderTracerouteResult("", "", String(e));
    }
  };

  submit.addEventListener("click", doSubmit);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") doSubmit();
  });
}

function loadWhoisTab() {
  tabContent.innerHTML = renderWhois();

  const input = document.getElementById("whois-input") as HTMLInputElement;
  const submit = document.getElementById("whois-submit")!;
  const result = document.getElementById("whois-result")!;

  const doSubmit = async () => {
    const target = input.value.trim();
    if (!target) return;

    result.classList.remove("hidden");
    result.innerHTML = `
      <div class="flex items-center justify-center py-4">
        <span class="loading loading-spinner"></span>
        <span class="ml-2">Looking up...</span>
      </div>
    `;

    try {
      const response = await fetchWhois(target);

      if (response.error) {
        result.innerHTML = renderWhoisResult("", response.error);
        return;
      }

      const data = response.result[0]?.data || "";
      result.innerHTML = renderWhoisResult(data);
    } catch (e) {
      result.innerHTML = renderWhoisResult("", String(e));
    }
  };

  submit.addEventListener("click", doSubmit);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") doSubmit();
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Start the app
init();

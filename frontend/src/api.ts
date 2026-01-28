// API Types
export interface ApiRequest {
  servers: string[];
  type: "summary" | "bird" | "traceroute" | "whois" | "server_list";
  args: string;
}

export interface SummaryRowData {
  name: string;
  proto: string;
  table: string;
  state: string;
  since: string;
  info: string;
}

export interface ApiGenericResultPair {
  server: string;
  data: string;
}

export interface ApiSummaryResultPair {
  server: string;
  data: SummaryRowData[];
}

export interface ApiGenericResponse {
  error: string;
  result: ApiGenericResultPair[];
}

export interface ApiSummaryResponse {
  error: string;
  result: ApiSummaryResultPair[];
}

// ECDSA Signing
let privateKey: CryptoKey | null = null;

export async function setPrivateKey(pemKey: string): Promise<void> {
  // Parse PEM format
  const pemHeader = "-----BEGIN EC PRIVATE KEY-----";
  const pemFooter = "-----END EC PRIVATE KEY-----";

  let keyData = pemKey.replace(pemHeader, "").replace(pemFooter, "");
  keyData = keyData.replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function signRequest(body: string, timestamp: string): Promise<string> {
  if (!privateKey) {
    return "";
  }

  const message = `${timestamp}:${body}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    data,
  );

  // Convert to base64
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// API Client
const API_BASE = "/api";

async function fetchApi<T>(request: ApiRequest): Promise<T> {
  const body = JSON.stringify(request);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await signRequest(body, timestamp);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (signature) {
    headers["X-Signature"] = signature;
    headers["X-Timestamp"] = timestamp;
  }

  const response = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// Public API functions
export async function fetchSummary(
  servers: string[],
): Promise<ApiSummaryResponse> {
  return fetchApi<ApiSummaryResponse>({
    servers,
    type: "summary",
    args: "",
  });
}

export async function fetchBirdCommand(
  servers: string[],
  command: string,
): Promise<ApiGenericResponse> {
  return fetchApi<ApiGenericResponse>({
    servers,
    type: "bird",
    args: command,
  });
}

export async function fetchTraceroute(
  servers: string[],
  target: string,
): Promise<ApiGenericResponse> {
  return fetchApi<ApiGenericResponse>({
    servers,
    type: "traceroute",
    args: target,
  });
}

export async function fetchWhois(target: string): Promise<ApiGenericResponse> {
  return fetchApi<ApiGenericResponse>({
    servers: [],
    type: "whois",
    args: target,
  });
}

export async function fetchServerList(): Promise<ApiGenericResponse> {
  return fetchApi<ApiGenericResponse>({
    servers: [],
    type: "server_list",
    args: "",
  });
}

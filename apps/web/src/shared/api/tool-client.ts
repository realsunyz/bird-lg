import { buildPostJSONHeaders } from "@/shared/lib/csrf";
import { extractErrorCode } from "@/shared/lib/target-validation";

type StreamRequestOptions = {
  url: string;
  body: unknown;
  startError: string;
  signal?: AbortSignal;
  onUnauthorized: () => void;
  onData: (line: string) => void;
};

async function consumeSSEResponse(response: Response, onData: (line: string) => void) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  const sepRe = /\r?\n\r?\n/;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    while (true) {
      const idx = buffer.search(sepRe);
      if (idx < 0) break;

      const rest = buffer.slice(idx);
      const sep = rest.match(sepRe)?.[0] ?? "\n\n";
      const event = buffer.slice(0, idx);
      buffer = buffer.slice(idx + sep.length);

      if (!event) continue;
      const lines = event.split(/\r?\n/);
      const dataLines: string[] = [];
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        let value = line.slice(5);
        if (value.startsWith(" ")) value = value.slice(1);
        dataLines.push(value);
      }
      if (dataLines.length > 0) {
        onData(dataLines.join("\n"));
      }
    }
  }
}

export function isAbortError(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (value instanceof DOMException && value.name === "AbortError") return true;
  return "name" in value && (value as { name?: unknown }).name === "AbortError";
}

export async function runStreamRequest({
  url,
  body,
  startError,
  signal,
  onUnauthorized,
  onData,
}: StreamRequestOptions) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: buildPostJSONHeaders(),
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (isAbortError(e)) return;
    throw e;
  }

  if (response.status === 401) {
    onUnauthorized();
    return;
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || startError);
  }

  try {
    await consumeSSEResponse(response, onData);
  } catch (e) {
    if (isAbortError(e)) return;
    throw e;
  }
}

export function getToolErrorMessage(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value);
  const code = extractErrorCode(message);
  switch (code) {
    case "ERR-TARGET-400-EMPTY":
      return "target_required";
    case "ERR-TARGET-400-FORMAT":
      return "target_invalid_format";
    case "ERR-TARGET-400-BOGON":
      return "target_bogon_blocked";
    case "ERR-SERVER-404":
      return "server_not_found";
    case "ERR-REQ-400":
      return "invalid_request";
    case "ERR-REQ-403-CSRF":
      return "csrf_failed";
    case "ERR-REQ-408":
      return "request_timeout";
    case "ERR-AUTH-401":
    case "ERR-AUTH-403-SSO_REQUIRED":
      return "auth_required";
    case "ERR-RATE-429":
      return "rate_limit_exceeded";
    case "ERR-CAPTCHA-503":
      return "captcha_unavailable";
    case "ERR-CAPTCHA-403":
      return "captcha_verification_failed";
    case "ERR-SERVER-502-CONNECT":
    case "ERR-SERVER-502-STATUS":
      return "server_error";
    case "ERR-SSO-404":
    case "ERR-SSO-400-MISSING_CODE":
    case "ERR-SSO-400-MISSING_VERIFIER":
    case "ERR-SSO-401-TOKEN_EXCHANGE":
    case "ERR-SSO-500-VERIFIER_GEN":
      return "sso_error";
    default:
      if (code) return "unknown_error";
      return message;
  }
}


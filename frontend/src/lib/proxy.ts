import crypto from "crypto";

interface ProxyRequest {
  type: string;
  args?: string;
}

function signRequest(
  body: string,
  secret: string,
): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${timestamp}:${body}`);
  return { signature: hmac.digest("base64"), timestamp };
}

export async function proxyToClient(
  endpoint: string,
  request: ProxyRequest,
  hmacSecret: string,
): Promise<{ data?: unknown; error?: string }> {
  const body = JSON.stringify(request);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (hmacSecret) {
    const { signature, timestamp } = signRequest(body, hmacSecret);
    headers["X-Signature"] = signature;
    headers["X-Timestamp"] = timestamp;
  }

  try {
    const response = await fetch(`${endpoint}/api/query`, {
      method: "POST",
      headers,
      body,
    });
    if (!response.ok) {
      return { error: `Client error: ${response.status}` };
    }
    return { data: await response.json() };
  } catch (error) {
    console.error("Proxy error:", error);
    return { error: "Failed to connect to client" };
  }
}

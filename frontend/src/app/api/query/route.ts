import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { verifyTurnstile } from "@/lib/turnstile";
import { proxyToClient } from "@/lib/proxy";

interface QueryRequest {
  type: "summary" | "bird" | "traceroute" | "whois";
  server: string;
  command?: string;
  target?: string;
}

export async function POST(request: NextRequest) {
  const config = getConfig();
  const turnstileToken = request.headers.get("X-Turnstile-Token");

  if (config.turnstile.secretKey) {
    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Missing verification token" },
        { status: 401 },
      );
    }

    const ip = request.headers.get("X-Forwarded-For") || undefined;
    const verification = await verifyTurnstile(
      config.turnstile.secretKey,
      turnstileToken,
      ip,
    );

    if (!verification.success) {
      return NextResponse.json({ error: verification.error }, { status: 403 });
    }
  }

  let body: QueryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const server = config.servers.find((s) => s.id === body.server);
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const proxyRequest: { type: string; args?: string } = { type: body.type };
  if (body.type === "bird") proxyRequest.args = body.command;
  if (body.type === "traceroute" || body.type === "whois")
    proxyRequest.args = body.target;

  const result = await proxyToClient(
    server.endpoint,
    proxyRequest,
    config.hmac.secret,
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result.data);
}

import { NextRequest, NextResponse } from "next/server";
import net from "net";

async function queryWhois(server: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(43, server, () => {
      socket.write(`${query}\r\n`);
    });

    let data = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      data += chunk;
    });
    socket.on("end", () => {
      resolve(data);
    });
    socket.on("error", (err) => {
      reject(err);
    });
    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error("Timeout"));
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target = body.query;

    if (!target) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Step 1: Query IANA
    let output = "";
    try {
      const ianaResult = await queryWhois("whois.iana.org", target);
      output += `--- IANA (${target}) ---\n${ianaResult}\n`;

      // Step 2: Check for referral
      const referMatch = ianaResult.match(/^refer:\s+(.+)$/m);
      if (referMatch && referMatch[1]) {
        const referralServer = referMatch[1].trim();
        output += `\n--- Referral: ${referralServer} ---\n`;
        const referralResult = await queryWhois(referralServer, target);
        output += referralResult;
      }
    } catch (e) {
      output += `\nError querying whois: ${e}`;
    }

    return NextResponse.json({ result: output });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

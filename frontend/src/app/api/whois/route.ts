import { NextRequest, NextResponse } from "next/server";
import net from "net";
import { checkBogon } from "@/lib/bogon";

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

    // Check if bogon
    const bogonCheck = checkBogon(target);
    if (bogonCheck.isBogon) {
      return NextResponse.json({ bogon: true, reason: bogonCheck.reason });
    }

    // Step 1: Query IANA
    let ianaResult = "";
    let rirResult = "";
    let rirServer = "";
    try {
      ianaResult = await queryWhois("whois.iana.org", target);

      // Step 2: Check for referral (IANA uses both 'refer:' and 'whois:')
      const referMatch = ianaResult.match(/^(?:refer|whois):\s+(.+)$/im);
      if (referMatch && referMatch[1]) {
        rirServer = referMatch[1].trim();
        rirResult = await queryWhois(rirServer, target);
      }
    } catch (e) {
      ianaResult += `\nError querying whois: ${e}`;
    }

    return NextResponse.json({ iana: ianaResult, rir: rirResult, rirServer });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getClientConfig } from "@/lib/config";

export async function GET() {
  return NextResponse.json(getClientConfig());
}

import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ status: "ok", mode: process.env.TASTEMATCH_LIVE === "1" && Boolean(process.env.QLOO_API_KEY) ? "live" : "mock" });
}

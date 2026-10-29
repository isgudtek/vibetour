import { NextResponse } from "next/server";
import { MOCK_CANDIDATES } from "@/lib/mock";

export async function GET() {
  return NextResponse.json({ candidates: MOCK_CANDIDATES });
}

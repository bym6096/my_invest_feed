import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // CRON_SECRET 미설정이면 항상 거부(누구나 비용을 유발하지 못하게)
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ results: await runIngest() });
}

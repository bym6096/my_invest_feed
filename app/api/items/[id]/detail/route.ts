import { NextResponse } from "next/server";
import { getOrCreateDetail } from "@/lib/detail";

export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{16}$/.test(id)) return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
  const r = await getOrCreateDetail(id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ detail: r.detail, limited: r.limited, cached: r.cached });
}

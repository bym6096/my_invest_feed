import type { IndicatorId } from "@/config/sections";

export interface IndicatorValue {
  id: IndicatorId;
  label: string;
  value: number;
  text: string;
}

export async function fetchIndicator(id: IndicatorId): Promise<IndicatorValue | null> {
  try {
    if (id === "fear_greed") {
      const res = await fetch("https://api.alternative.me/fng/?limit=1", { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      const j = (await res.json()) as { data?: { value: string; value_classification: string }[] };
      const d = j.data?.[0];
      if (!d) return null;
      return { id, label: "공포·탐욕 지수", value: Number(d.value), text: d.value_classification };
    }
  } catch {
    /* 지표는 보조 정보라 실패해도 수집을 막지 않는다 */
  }
  return null;
}

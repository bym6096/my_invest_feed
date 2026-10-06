"use client";

import { useState } from "react";

export default function DetailButton({ id, initial }: { id: string; initial: string | null }) {
  const [detail, setDetail] = useState<string | null>(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (detail) return setOpen((v) => !v);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${id}/detail`, { method: "POST" });
      const j = (await res.json()) as { detail?: string; error?: string };
      if (!res.ok || !j.detail) throw new Error(j.error ?? "실패했어요.");
      setDetail(j.detail);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn" onClick={load} disabled={loading}>
        {loading ? "정리 중…" : detail ? (open ? "접기" : "상세 보기") : "번역·정리해서 보기"}
      </button>
      {error && <p className="err">{error}</p>}
      {open && detail && <div className="detail">{detail}</div>}
    </div>
  );
}

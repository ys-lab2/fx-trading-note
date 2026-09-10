"use client";

import { useMemo, useState } from "react";
import { jstDateKey } from "@/lib/jst-date";
import type { TradeSide, TradeResult } from "@/lib/supabase/types";

type TradeRow = {
  id: string;
  pair: string;
  side: TradeSide;
  result: TradeResult | null;
  pnl_amount: number | null;
  closed_at: string | null;
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarGrid({
  year,
  month,
  trades,
}: {
  year: number;
  month: number;
  trades: TradeRow[];
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, TradeRow[]>();
    for (const trade of trades) {
      if (!trade.closed_at) continue;
      const key = jstDateKey(trade.closed_at);
      const list = map.get(key) ?? [];
      list.push(trade);
      map.set(key, list);
    }
    return map;
  }, [trades]);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const cells: ({ day: number; key: string } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      key: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  const monthTotal = trades.reduce((sum, t) => sum + (t.pnl_amount ?? 0), 0);
  const selectedTrades = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div>
      <p className="mb-3 text-sm">
        月合計:{" "}
        <span className={monthTotal >= 0 ? "text-green-600" : "text-red-600"}>
          {Math.round(monthTotal).toLocaleString()}円
        </span>
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-black/60 dark:text-white/60">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;

          const dayTrades = byDay.get(cell.key) ?? [];
          const hasTrades = dayTrades.length > 0;
          const total = dayTrades.reduce((sum, t) => sum + (t.pnl_amount ?? 0), 0);
          const isSelected = selectedDay === cell.key;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : cell.key)}
              disabled={!hasTrades}
              className={`flex h-16 flex-col items-center justify-center rounded border text-xs transition disabled:cursor-default ${
                isSelected ? "border-black dark:border-white" : "border-black/10 dark:border-white/10"
              } ${
                !hasTrades
                  ? "text-black/30 dark:text-white/30"
                  : total >= 0
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
              }`}
            >
              <span>{cell.day}</span>
              {hasTrades && <span className="font-medium">{Math.round(total).toLocaleString()}</span>}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 rounded border border-black/10 p-4 dark:border-white/10">
          <h3 className="mb-2 text-sm font-semibold">{selectedDay} のトレード</h3>
          {selectedTrades.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">この日のトレードはありません。</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {selectedTrades.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between border-b border-black/5 py-1 dark:border-white/5"
                >
                  <span>
                    {t.pair} {t.side === "buy" ? "買い" : "売り"}
                  </span>
                  <span className={(t.pnl_amount ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                    {t.pnl_amount != null ? `${Math.round(t.pnl_amount).toLocaleString()}円` : "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

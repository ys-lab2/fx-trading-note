"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { decodeMt5CsvFile, parseMt5Csv, candlesInWindow } from "@/lib/mt5-csv";
import { calcMaeMfePips } from "@/lib/trade-calculations";
import type { CurrencyPair, DstMode, UserSettings } from "@/lib/supabase/types";

const inputClass =
  "w-full rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-black";

type Result = {
  totalCandidates: number;
  updated: number;
  skippedNoCandles: number;
};

export default function MaeMfeImportForm({
  pairs,
  initialSettings,
}: {
  pairs: CurrencyPair[];
  initialSettings: UserSettings | null;
}) {
  const supabase = createClient();
  const [pair, setPair] = useState(pairs[0]?.symbol ?? "");
  const [dstMode, setDstMode] = useState<DstMode>(initialSettings?.dst_mode ?? "summer");
  const [summerHours, setSummerHours] = useState(
    String(initialSettings?.mt5_offset_summer_hours ?? 6)
  );
  const [winterHours, setWinterHours] = useState(
    String(initialSettings?.mt5_offset_winter_hours ?? 7)
  );
  const [file, setFile] = useState<File | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const category = pairs.find((p) => p.symbol === pair)?.category ?? null;
  const effectiveOffsetHours = dstMode === "summer" ? Number(summerHours) : Number(winterHours);

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsSaved(false);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

      const { error: upsertError } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        dst_mode: dstMode,
        mt5_offset_summer_hours: Number(summerHours),
        mt5_offset_winter_hours: Number(winterHours),
        updated_at: new Date().toISOString(),
      });
      if (upsertError) throw upsertError;
      setSettingsSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "設定の保存に失敗しました");
    } finally {
      setSavingSettings(false);
    }
  }

  async function runImport() {
    if (!file) {
      setError("CSVファイルを選択してください");
      return;
    }
    if (!pair) {
      setError("通貨ペアを選択してください");
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const text = await decodeMt5CsvFile(file);
      const candles = parseMt5Csv(text, effectiveOffsetHours);
      if (candles.length === 0) {
        throw new Error("CSVからロウソク足を読み取れませんでした。フォーマットを確認してください。");
      }

      const rangeStartIso = new Date(candles[0].timeMs).toISOString();
      const rangeEndIso = new Date(candles[candles.length - 1].timeMs).toISOString();

      const { data: trades, error: fetchError } = await supabase
        .from("trades")
        .select("id, side, entry_price, opened_at, closed_at")
        .eq("pair", pair)
        .not("closed_at", "is", null)
        .gte("opened_at", rangeStartIso)
        .lte("closed_at", rangeEndIso);
      if (fetchError) throw fetchError;

      let updated = 0;
      let skippedNoCandles = 0;

      for (const trade of trades ?? []) {
        const openedMs = new Date(trade.opened_at).getTime();
        const closedMs = new Date(trade.closed_at!).getTime();
        const windowCandles = candlesInWindow(candles, openedMs, closedMs);

        const maeMfe = calcMaeMfePips(
          pair,
          trade.side,
          trade.entry_price,
          windowCandles,
          category
        );
        if (!maeMfe) {
          skippedNoCandles += 1;
          continue;
        }

        const { error: updateError } = await supabase
          .from("trades")
          .update({ mae_pips: maeMfe.maePips, mfe_pips: maeMfe.mfePips })
          .eq("id", trade.id);
        if (updateError) throw updateError;
        updated += 1;
      }

      setResult({ totalCandidates: trades?.length ?? 0, updated, skippedNoCandles });
    } catch (err) {
      setError(err instanceof Error ? err.message : "インポートに失敗しました");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-semibold">時差設定（JST とMT5サーバー時刻の差）</h2>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="dst_mode"
              checked={dstMode === "summer"}
              onChange={() => setDstMode("summer")}
            />
            サマータイム
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="dst_mode"
              checked={dstMode === "winter"}
              onChange={() => setDstMode("winter")}
            />
            ウィンタータイム
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="summer_hours" className="text-xs text-black/60 dark:text-white/60">
              サマータイム時差（時間、JSTが進んでいる分）
            </label>
            <input
              id="summer_hours"
              type="number"
              step="any"
              value={summerHours}
              onChange={(e) => setSummerHours(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="winter_hours" className="text-xs text-black/60 dark:text-white/60">
              ウィンタータイム時差（時間、JSTが進んでいる分）
            </label>
            <input
              id="winter_hours"
              type="number"
              step="any"
              value={winterHours}
              onChange={(e) => setWinterHours(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          現在の設定: MT5サーバー時刻 = JST − {effectiveOffsetHours}時間
        </p>
        <button
          type="button"
          onClick={saveSettings}
          disabled={savingSettings}
          className="rounded border border-black/20 px-3 py-1.5 text-xs font-medium dark:border-white/20"
        >
          {savingSettings ? "保存中..." : "設定を保存"}
        </button>
        {settingsSaved && <span className="ml-2 text-xs text-green-600">保存しました</span>}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="import_pair" className="text-sm font-medium">
            通貨ペア
          </label>
          {pairs.length > 0 ? (
            <select
              id="import_pair"
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className={inputClass}
            >
              {pairs.map((p) => (
                <option key={p.id} value={p.symbol}>
                  {p.symbol}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-red-600">
              先に「通貨ペア」タブから通貨ペアを登録してください。
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="csv_file" className="text-sm font-medium">
            MT5 M1 ロウソク足CSV
          </label>
          <input
            id="csv_file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>

        <button
          type="button"
          onClick={runImport}
          disabled={running || pairs.length === 0}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {running ? "インポート中..." : "インポート実行"}
        </button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded border border-black/10 p-4 text-sm dark:border-white/10">
          <p>CSVの保有期間内にあるトレード: {result.totalCandidates}件</p>
          <p className="text-green-600">MAE/MFEを更新: {result.updated}件</p>
          {result.skippedNoCandles > 0 && (
            <p className="text-black/60 dark:text-white/60">
              期間内にロウソク足が見つからずスキップ: {result.skippedNoCandles}件
            </p>
          )}
        </div>
      )}
    </div>
  );
}

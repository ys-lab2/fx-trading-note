"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createTrade } from "@/app/(app)/trades/actions";
import { calcRiskReward, calcPnlPips, calcPnlAmountJpy, pipSize } from "@/lib/trade-calculations";
import { uploadTradeScreenshot } from "@/lib/screenshot-upload";
import DatetimeNavInput from "@/components/datetime-nav-input";
import NumberStepInput from "@/components/number-step-input";
import type { CurrencyPair, TradeSide } from "@/lib/supabase/types";

export default function NewTradeForm({ pairs }: { pairs: CurrencyPair[] }) {
  const supabase = createClient();
  const [pair, setPair] = useState(pairs[0]?.symbol ?? "");
  const [side, setSide] = useState<TradeSide>("buy");
  const [lotSize, setLotSize] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  // null = not yet edited by hand, so it tracks the entry price automatically.
  const [lcOverride, setLcOverride] = useState<string | null>(null);
  const [tpOverride, setTpOverride] = useState<string | null>(null);
  const lcTarget = lcOverride ?? entryPrice;
  const tpTarget = tpOverride ?? entryPrice;
  const [usdJpyBaseRate, setUsdJpyBaseRate] = useState("");
  const [pnlAmount, setPnlAmount] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fetchingEntry, setFetchingEntry] = useState(false);
  const [fetchingExit, setFetchingExit] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const category = pairs.find((p) => p.symbol === pair)?.category ?? null;
  const priceStep = pipSize(pair, category) / 10;

  const riskReward = useMemo(
    () =>
      calcRiskReward(
        entryPrice === "" ? null : Number(entryPrice),
        lcTarget === "" ? null : Number(lcTarget),
        tpTarget === "" ? null : Number(tpTarget)
      ),
    [entryPrice, lcTarget, tpTarget]
  );

  const computedPnlPips = useMemo(
    () =>
      calcPnlPips(
        pair,
        side,
        entryPrice === "" ? null : Number(entryPrice),
        exitPrice === "" ? null : Number(exitPrice),
        category
      ),
    [pair, side, entryPrice, exitPrice, category]
  );

  const computedPnlAmount = useMemo(
    () =>
      calcPnlAmountJpy(
        category,
        computedPnlPips,
        lotSize === "" ? null : Number(lotSize),
        usdJpyBaseRate === "" ? null : Number(usdJpyBaseRate)
      ),
    [category, computedPnlPips, lotSize, usdJpyBaseRate]
  );

  async function fetchRate(target: "entry" | "exit") {
    if (!pair) return;
    const setLoading = target === "entry" ? setFetchingEntry : setFetchingExit;
    setLoading(true);
    setRateError(null);
    try {
      const res = await fetch(`/api/rate?pair=${pair}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "レートの取得に失敗しました");
      const rateStr = String(json.rate);
      if (target === "entry") setEntryPrice(rateStr);
      else setExitPrice(rateStr);
    } catch (err) {
      setRateError(err instanceof Error ? err.message : "レートの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");
      const path = await uploadTradeScreenshot(file, user.id);
      setScreenshotUrl(path);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={createTrade} className="space-y-6">
      <section className="grid grid-cols-2 gap-4">
        <Field label="エントリー日時" htmlFor="opened_at">
          <DatetimeNavInput id="opened_at" name="opened_at" required className={inputClass} />
        </Field>
        <Field label="決済日時" htmlFor="closed_at">
          <DatetimeNavInput id="closed_at" name="closed_at" className={inputClass} />
        </Field>
        <Field label="通貨ペア" htmlFor="pair">
          {pairs.length > 0 ? (
            <select
              id="pair"
              name="pair"
              required
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
              通貨ペアが未登録です。先に「通貨ペア」タブから登録してください。
            </p>
          )}
        </Field>
        <Field label="売買方向" htmlFor="side">
          <select
            id="side"
            name="side"
            required
            value={side}
            onChange={(e) => setSide(e.target.value as TradeSide)}
            className={inputClass}
          >
            <option value="buy">買い (Buy)</option>
            <option value="sell">売り (Sell)</option>
          </select>
        </Field>
        <Field label="ロット数" htmlFor="lot_size">
          <NumberStepInput
            id="lot_size"
            name="lot_size"
            required
            step={0.01}
            value={lotSize}
            onChange={setLotSize}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Field label="エントリー価格" htmlFor="entry_price">
          <div className="flex gap-2">
            <NumberStepInput
              id="entry_price"
              name="entry_price"
              required
              step={priceStep}
              value={entryPrice}
              onChange={setEntryPrice}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => fetchRate("entry")}
              disabled={fetchingEntry || !pair}
              className="shrink-0 rounded border border-black/20 px-3 text-xs font-medium disabled:opacity-50 dark:border-white/20"
            >
              {fetchingEntry ? "取得中..." : "現在レート取得"}
            </button>
          </div>
        </Field>
        <Field label="決済価格" htmlFor="exit_price">
          <div className="flex gap-2">
            <NumberStepInput
              id="exit_price"
              name="exit_price"
              step={priceStep}
              value={exitPrice}
              onChange={setExitPrice}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => fetchRate("exit")}
              disabled={fetchingExit || !pair}
              className="shrink-0 rounded border border-black/20 px-3 text-xs font-medium disabled:opacity-50 dark:border-white/20"
            >
              {fetchingExit ? "取得中..." : "現在レート取得"}
            </button>
          </div>
        </Field>
        {rateError && <p className="col-span-2 text-xs text-red-600">{rateError}</p>}
        {category === "dollar_straight" && (
          <Field label="USDJPY基準レート" htmlFor="usdjpy_base_rate">
            <NumberStepInput
              id="usdjpy_base_rate"
              name="usdjpy_base_rate"
              step={0.01}
              value={usdJpyBaseRate}
              onChange={setUsdJpyBaseRate}
              placeholder="例: 150.00"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              ドルストレートの pips あたり損益を円換算するための USDJPY レート
            </p>
          </Field>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 rounded border border-black/10 p-4 dark:border-white/10">
        <Field label="LC target（ロスカット価格）" htmlFor="lc_target">
          <NumberStepInput
            id="lc_target"
            name="lc_target"
            step={priceStep}
            value={lcTarget}
            onChange={setLcOverride}
            className={inputClass}
          />
        </Field>
        <Field label="TP target（利確目標価格）" htmlFor="tp_target">
          <NumberStepInput
            id="tp_target"
            name="tp_target"
            step={priceStep}
            value={tpTarget}
            onChange={setTpOverride}
            className={inputClass}
          />
        </Field>
        <p className="col-span-2 -mt-2 text-xs text-black/50 dark:text-white/50">
          LC/TPはエントリー価格を入力すると自動で同じ値が入ります（未編集の間だけ追従）。
        </p>
        <div className="col-span-2 text-sm text-black/60 dark:text-white/60">
          R:R（自動計算）: {riskReward != null ? riskReward.toFixed(2) : "-"}
        </div>
        <Field label="MAE（最大逆行, pips）" htmlFor="mae_pips">
          <NumberStepInput id="mae_pips" name="mae_pips" step={0.1} className={inputClass} />
        </Field>
        <Field label="MFE（最大含み益, pips）" htmlFor="mfe_pips">
          <NumberStepInput id="mfe_pips" name="mfe_pips" step={0.1} className={inputClass} />
        </Field>
        <p className="col-span-2 text-xs text-black/50 dark:text-white/50">
          MAE/MFEは「トレード記録」画面の「MAE/MFE一括インポート」からMT5 CSVを使って一括入力できます。
          ここでは手動入力も可能です。
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Field label="手数料" htmlFor="fee">
          <NumberStepInput id="fee" name="fee" step={1} className={inputClass} />
        </Field>
        <Field label="スワップ" htmlFor="swap">
          <NumberStepInput id="swap" name="swap" step={1} className={inputClass} />
        </Field>
        <Field label="損益(pips)（自動計算）" htmlFor="pnl_pips_preview">
          <input
            id="pnl_pips_preview"
            type="text"
            readOnly
            value={computedPnlPips != null ? computedPnlPips.toFixed(1) : ""}
            className={`${inputClass} bg-black/5 dark:bg-white/10`}
          />
        </Field>
        <Field label="損益金額（円）" htmlFor="pnl_amount">
          <NumberStepInput
            id="pnl_amount"
            name="pnl_amount"
            step={1}
            value={pnlAmount}
            onChange={setPnlAmount}
            className={inputClass}
          />
          {computedPnlAmount != null && (
            <button
              type="button"
              onClick={() => setPnlAmount(computedPnlAmount.toFixed(0))}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              自動計算値を使用（{computedPnlAmount.toFixed(0)}円）
            </button>
          )}
        </Field>
        <Field label="WIN / LOSE" htmlFor="result">
          <select id="result" name="result" defaultValue="" className={inputClass}>
            <option value="">未設定（損益から自動判定）</option>
            <option value="win">WIN</option>
            <option value="lose">LOSE</option>
          </select>
        </Field>
      </section>

      <Field label="振り返りメモ" htmlFor="memo">
        <textarea id="memo" name="memo" rows={4} className={inputClass} />
      </Field>

      <Field label="スクリーンショット" htmlFor="screenshot">
        <input id="screenshot" type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
        <input type="hidden" name="screenshot_url" value={screenshotUrl} />
        {uploading && <p className="mt-1 text-xs text-black/50 dark:text-white/50">アップロード中...</p>}
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        {screenshotUrl && !uploading && (
          <p className="mt-1 text-xs text-green-600">アップロード完了</p>
        )}
      </Field>

      <button
        type="submit"
        disabled={uploading || pairs.length === 0}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        保存
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-black";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

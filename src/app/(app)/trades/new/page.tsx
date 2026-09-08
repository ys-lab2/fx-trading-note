"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createTrade } from "@/app/(app)/trades/actions";
import { calcRiskReward } from "@/lib/trade-calculations";
import { uploadTradeScreenshot } from "@/lib/screenshot-upload";

export default function NewTradePage() {
  const supabase = createClient();
  const [pair, setPair] = useState("USDJPY");
  const [entryPrice, setEntryPrice] = useState("");
  const [lcTarget, setLcTarget] = useState("");
  const [tpTarget, setTpTarget] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const riskReward = useMemo(
    () =>
      calcRiskReward(
        entryPrice === "" ? null : Number(entryPrice),
        lcTarget === "" ? null : Number(lcTarget),
        tpTarget === "" ? null : Number(tpTarget)
      ),
    [entryPrice, lcTarget, tpTarget]
  );

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
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">トレードを記録</h1>
      <form action={createTrade} className="space-y-6">
        <section className="grid grid-cols-2 gap-4">
          <Field label="エントリー日時" htmlFor="opened_at">
            <input id="opened_at" name="opened_at" type="datetime-local" required className={inputClass} />
          </Field>
          <Field label="決済日時" htmlFor="closed_at">
            <input id="closed_at" name="closed_at" type="datetime-local" className={inputClass} />
          </Field>
          <Field label="通貨ペア" htmlFor="pair">
            <input
              id="pair"
              name="pair"
              type="text"
              required
              value={pair}
              onChange={(e) => setPair(e.target.value.toUpperCase())}
              placeholder="USDJPY"
              className={inputClass}
            />
          </Field>
          <Field label="売買方向" htmlFor="side">
            <select id="side" name="side" required className={inputClass}>
              <option value="buy">買い (Buy)</option>
              <option value="sell">売り (Sell)</option>
            </select>
          </Field>
          <Field label="ロット数" htmlFor="lot_size">
            <input id="lot_size" name="lot_size" type="number" step="any" required className={inputClass} />
          </Field>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <Field label="エントリー価格" htmlFor="entry_price">
            <input
              id="entry_price"
              name="entry_price"
              type="number"
              step="any"
              required
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="決済価格" htmlFor="exit_price">
            <input id="exit_price" name="exit_price" type="number" step="any" className={inputClass} />
          </Field>
        </section>

        <section className="grid grid-cols-2 gap-4 rounded border border-black/10 p-4 dark:border-white/10">
          <Field label="LC target（ロスカット価格）" htmlFor="lc_target">
            <input
              id="lc_target"
              name="lc_target"
              type="number"
              step="any"
              value={lcTarget}
              onChange={(e) => setLcTarget(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="TP target（利確目標価格）" htmlFor="tp_target">
            <input
              id="tp_target"
              name="tp_target"
              type="number"
              step="any"
              value={tpTarget}
              onChange={(e) => setTpTarget(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="col-span-2 text-sm text-black/60 dark:text-white/60">
            R:R（自動計算）: {riskReward != null ? riskReward.toFixed(2) : "-"}
          </div>
          <Field label="MAE（最大逆行, pips）" htmlFor="mae_pips">
            <input id="mae_pips" name="mae_pips" type="number" step="any" className={inputClass} />
          </Field>
          <Field label="MFE（最大含み益, pips）" htmlFor="mfe_pips">
            <input id="mfe_pips" name="mfe_pips" type="number" step="any" className={inputClass} />
          </Field>
          <p className="col-span-2 text-xs text-black/50 dark:text-white/50">
            MAE/MFEは今後MT5 CSVインポートから自動入力予定です。現時点では手動入力してください。
          </p>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <Field label="手数料" htmlFor="fee">
            <input id="fee" name="fee" type="number" step="any" className={inputClass} />
          </Field>
          <Field label="スワップ" htmlFor="swap">
            <input id="swap" name="swap" type="number" step="any" className={inputClass} />
          </Field>
          <Field label="損益金額" htmlFor="pnl_amount">
            <input id="pnl_amount" name="pnl_amount" type="number" step="any" className={inputClass} />
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
          disabled={uploading}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          保存
        </button>
      </form>
    </div>
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

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteTrade } from "@/app/(app)/trades/actions";
import DeleteTradeButton from "@/components/delete-trade-button";

export default async function TradesPage() {
  const supabase = await createClient();
  const { data: trades, error } = await supabase
    .from("trades")
    .select("*")
    .order("opened_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">トレード記録</h1>
        <div className="flex gap-2">
          <Link
            href="/trades/import"
            className="rounded border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/20"
          >
            MAE/MFE一括インポート
          </Link>
          <Link
            href="/trades/new"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            + 新規記録
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">読み込みエラー: {error.message}</p>}

      {!error && trades?.length === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          まだトレード記録がありません。「+ 新規記録」から追加してください。
        </p>
      )}

      {trades && trades.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
                <th className="py-2 pr-4">日時</th>
                <th className="py-2 pr-4">通貨ペア</th>
                <th className="py-2 pr-4">方向</th>
                <th className="py-2 pr-4">ロット</th>
                <th className="py-2 pr-4">損益(pips)</th>
                <th className="py-2 pr-4">R:R</th>
                <th className="py-2 pr-4">MAE</th>
                <th className="py-2 pr-4">MFE</th>
                <th className="py-2 pr-4">結果</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2 pr-4">{new Date(trade.opened_at).toLocaleString("ja-JP")}</td>
                  <td className="py-2 pr-4">{trade.pair}</td>
                  <td className="py-2 pr-4">{trade.side === "buy" ? "買い" : "売り"}</td>
                  <td className="py-2 pr-4">{trade.lot_size}</td>
                  <td className="py-2 pr-4">{trade.pnl_pips?.toFixed(1) ?? "-"}</td>
                  <td className="py-2 pr-4">{trade.risk_reward?.toFixed(2) ?? "-"}</td>
                  <td className="py-2 pr-4">{trade.mae_pips ?? "-"}</td>
                  <td className="py-2 pr-4">{trade.mfe_pips ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {trade.result && (
                      <span
                        className={
                          trade.result === "win"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {trade.result.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <DeleteTradeButton id={trade.id} action={deleteTrade} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

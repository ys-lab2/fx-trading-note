import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calcTradeStats, buildEquityCurve, periodRangeUtc, type DashboardPeriod } from "@/lib/dashboard-calculations";
import EquityChart from "@/app/(app)/dashboard/equity-chart";

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  all: "全期間",
  this_month: "今月",
  last_month: "先月",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period: DashboardPeriod =
    rawPeriod === "this_month" || rawPeriod === "last_month" ? rawPeriod : "all";

  const supabase = await createClient();
  let query = supabase
    .from("trades")
    .select("result, pnl_amount, risk_reward, closed_at")
    .order("closed_at", { ascending: true });

  const range = periodRangeUtc(period);
  if (range) {
    query = query.gte("closed_at", range.startIso).lt("closed_at", range.endIso);
  }

  const { data: trades, error } = await query;
  const stats = calcTradeStats(trades ?? []);
  const equity = buildEquityCurve(trades ?? []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">ダッシュボード</h1>
        <div className="flex gap-2 text-sm">
          {(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map((p) => (
            <Link
              key={p}
              href={p === "all" ? "/dashboard" : `/dashboard?period=${p}`}
              className={`rounded border px-3 py-1.5 ${
                p === period
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/20 dark:border-white/20"
              }`}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">読み込みエラー: {error.message}</p>}

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatTile label="総トレード数" value={String(stats.totalTrades)} />
        <StatTile
          label="勝率"
          value={stats.winRate != null ? `${(stats.winRate * 100).toFixed(1)}%` : "-"}
        />
        <StatTile
          label="プロフィットファクター"
          value={
            stats.profitFactor == null
              ? "-"
              : stats.profitFactor === Infinity
                ? "∞"
                : stats.profitFactor.toFixed(2)
          }
        />
        <StatTile
          label="平均損益"
          value={
            stats.avgPnlAmount != null ? `${Math.round(stats.avgPnlAmount).toLocaleString()}円` : "-"
          }
          tone={stats.avgPnlAmount == null ? "neutral" : stats.avgPnlAmount >= 0 ? "positive" : "negative"}
        />
        <StatTile
          label="平均R:R"
          value={stats.avgRiskReward != null ? stats.avgRiskReward.toFixed(2) : "-"}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">資産推移（累計損益）</h2>
        {equity.length > 0 ? (
          <EquityChart data={equity} />
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            この期間に決済済みの損益データがありません。
          </p>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass = tone === "positive" ? "text-green-600" : tone === "negative" ? "text-red-600" : "";
  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <div className="text-xs text-black/60 dark:text-white/60">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

import type { Trade } from "@/lib/supabase/types";
import { jstMonthRangeUtc, jstToday } from "@/lib/jst-date";

export type DashboardPeriod = "all" | "this_month" | "last_month";

/** UTC ISO bounds for a dashboard period, or null for "all" (no filter). */
export function periodRangeUtc(period: DashboardPeriod): { startIso: string; endIso: string } | null {
  if (period === "all") return null;

  const { year, month } = jstToday();
  if (period === "this_month") return jstMonthRangeUtc(year, month);

  const lastMonthYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;
  return jstMonthRangeUtc(lastMonthYear, lastMonth);
}

export type TradeStats = {
  totalTrades: number;
  winRate: number | null;
  /** Infinity when there are winning trades and zero losing amount. */
  profitFactor: number | null;
  avgPnlAmount: number | null;
  avgRiskReward: number | null;
};

type StatsInput = Pick<Trade, "result" | "pnl_amount" | "risk_reward">;

export function calcTradeStats(trades: StatsInput[]): TradeStats {
  const withResult = trades.filter((t) => t.result != null);
  const wins = withResult.filter((t) => t.result === "win").length;
  const winRate = withResult.length > 0 ? wins / withResult.length : null;

  const pnlAmounts = trades.map((t) => t.pnl_amount).filter((v): v is number => v != null);
  const grossProfit = pnlAmounts.filter((v) => v > 0).reduce((a, b) => a + b, 0);
  const grossLoss = pnlAmounts.filter((v) => v < 0).reduce((a, b) => a + b, 0);
  const profitFactor =
    grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? Infinity : null;
  const avgPnlAmount =
    pnlAmounts.length > 0 ? pnlAmounts.reduce((a, b) => a + b, 0) / pnlAmounts.length : null;

  const rrValues = trades.map((t) => t.risk_reward).filter((v): v is number => v != null);
  const avgRiskReward =
    rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : null;

  return { totalTrades: trades.length, winRate, profitFactor, avgPnlAmount, avgRiskReward };
}

export type EquityPoint = { date: string; cumulative: number };

function hasClosedPnl(
  t: Pick<Trade, "closed_at" | "pnl_amount">
): t is { closed_at: string; pnl_amount: number } {
  return t.closed_at != null && t.pnl_amount != null;
}

/** Cumulative pnl_amount ordered by settlement time, for an equity-curve chart. */
export function buildEquityCurve(trades: Pick<Trade, "closed_at" | "pnl_amount">[]): EquityPoint[] {
  const withPnl = trades
    .filter(hasClosedPnl)
    .sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());

  let cumulative = 0;
  return withPnl.map((t) => {
    cumulative += t.pnl_amount;
    return { date: t.closed_at, cumulative };
  });
}

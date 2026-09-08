import type { PairCategory, TradeSide } from "@/lib/supabase/types";

/** Standard FX contract size: 1.0 lot = 100,000 units of base currency. */
const CONTRACT_SIZE = 100_000;

/**
 * Pip size in quote-currency terms. Cross-yen pairs (quote = JPY) move in
 * 0.01 increments; everything else (dollar-straight majors) moves in 0.0001.
 * Falls back to the JPY-suffix heuristic when a pair isn't registered yet.
 */
export function pipSize(pair: string, category?: PairCategory | null): number {
  if (category === "cross_yen") return 0.01;
  if (category === "dollar_straight") return 0.0001;
  return pair.toUpperCase().endsWith("JPY") ? 0.01 : 0.0001;
}

export function priceDiffToPips(
  pair: string,
  diff: number,
  category?: PairCategory | null
): number {
  return diff / pipSize(pair, category);
}

/** Risk:Reward ratio from entry/LC/TP prices, independent of buy/sell direction. */
export function calcRiskReward(
  entryPrice: number | null,
  lcTarget: number | null,
  tpTarget: number | null
): number | null {
  if (entryPrice == null || lcTarget == null || tpTarget == null) return null;

  const risk = Math.abs(entryPrice - lcTarget);
  const reward = Math.abs(tpTarget - entryPrice);
  if (risk === 0) return null;

  return reward / risk;
}

export function calcPnlPips(
  pair: string,
  side: TradeSide,
  entryPrice: number | null,
  exitPrice: number | null,
  category?: PairCategory | null
): number | null {
  if (entryPrice == null || exitPrice == null) return null;

  const diff = side === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return priceDiffToPips(pair, diff, category);
}

/**
 * JPY pnl amount from a pips result. Cross-yen pairs are already quoted in
 * JPY, so one pip on a standard lot is a fixed 1000 JPY (pipSize 0.01 *
 * CONTRACT_SIZE). Dollar-straight pairs are quoted in USD, so one pip on a
 * standard lot is $10 (pipSize 0.0001 * CONTRACT_SIZE) and needs the
 * USDJPY base rate to convert to JPY.
 */
export function calcPnlAmountJpy(
  category: PairCategory | null,
  pips: number | null,
  lotSize: number | null,
  usdJpyBaseRate: number | null
): number | null {
  if (pips == null || lotSize == null) return null;

  if (category === "dollar_straight") {
    if (usdJpyBaseRate == null) return null;
    const pipValuePerLotUsd = 0.0001 * CONTRACT_SIZE;
    return pips * pipValuePerLotUsd * lotSize * usdJpyBaseRate;
  }

  // cross_yen (or unregistered pair): treat as JPY-quoted.
  const pipValuePerLotJpy = 0.01 * CONTRACT_SIZE;
  return pips * pipValuePerLotJpy * lotSize;
}

export type Candle = {
  /** Candle open time as a UTC epoch millisecond timestamp. */
  timeMs: number;
  high: number;
  low: number;
};

/**
 * Maximum Adverse/Favorable Excursion in pips, scanned over every candle
 * whose time falls within [openedAtMs, closedAtMs]. Both are always >= 0:
 * MFE is 0 if price never moved in the trade's favor, MAE is 0 if it never
 * moved against it.
 */
export function calcMaeMfePips(
  pair: string,
  side: TradeSide,
  entryPrice: number,
  candles: Candle[],
  category?: PairCategory | null
): { maePips: number; mfePips: number } | null {
  if (candles.length === 0) return null;

  let worstAdverse = 0; // price distance against the position
  let bestFavorable = 0; // price distance in favor of the position

  for (const candle of candles) {
    if (side === "buy") {
      worstAdverse = Math.max(worstAdverse, entryPrice - candle.low);
      bestFavorable = Math.max(bestFavorable, candle.high - entryPrice);
    } else {
      worstAdverse = Math.max(worstAdverse, candle.high - entryPrice);
      bestFavorable = Math.max(bestFavorable, entryPrice - candle.low);
    }
  }

  return {
    maePips: priceDiffToPips(pair, worstAdverse, category),
    mfePips: priceDiffToPips(pair, bestFavorable, category),
  };
}

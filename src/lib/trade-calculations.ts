/** Pip size is 0.01 for JPY-quoted pairs and 0.0001 for everything else. */
export function pipSize(pair: string): number {
  return pair.toUpperCase().endsWith("JPY") ? 0.01 : 0.0001;
}

export function priceDiffToPips(pair: string, diff: number): number {
  return diff / pipSize(pair);
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
  side: "buy" | "sell",
  entryPrice: number | null,
  exitPrice: number | null
): number | null {
  if (entryPrice == null || exitPrice == null) return null;

  const diff = side === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return priceDiffToPips(pair, diff);
}

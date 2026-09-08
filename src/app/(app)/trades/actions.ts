"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcPnlPips, calcRiskReward } from "@/lib/trade-calculations";
import type { TradeSide, TradeResult } from "@/lib/supabase/types";

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(value: FormDataEntryValue | null): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export async function createTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pair = String(formData.get("pair")).toUpperCase();
  const side = String(formData.get("side")) as TradeSide;
  const entryPrice = numberOrNull(formData.get("entry_price"));
  const exitPrice = numberOrNull(formData.get("exit_price"));
  const lcTarget = numberOrNull(formData.get("lc_target"));
  const tpTarget = numberOrNull(formData.get("tp_target"));
  const openedAt = String(formData.get("opened_at"));
  const closedAt = stringOrNull(formData.get("closed_at"));

  const pnlPips = calcPnlPips(pair, side, entryPrice, exitPrice);
  const riskReward = calcRiskReward(entryPrice, lcTarget, tpTarget);

  let result = stringOrNull(formData.get("result")) as TradeResult | null;
  if (!result && pnlPips != null) {
    result = pnlPips >= 0 ? "win" : "lose";
  }

  const { error } = await supabase.from("trades").insert({
    user_id: user!.id,
    opened_at: new Date(openedAt).toISOString(),
    closed_at: closedAt ? new Date(closedAt).toISOString() : null,
    pair,
    side,
    lot_size: numberOrNull(formData.get("lot_size")) ?? 0,
    entry_price: entryPrice ?? 0,
    exit_price: exitPrice,
    pnl_pips: pnlPips,
    pnl_amount: numberOrNull(formData.get("pnl_amount")),
    fee: numberOrNull(formData.get("fee")),
    swap: numberOrNull(formData.get("swap")),
    lc_target: lcTarget,
    tp_target: tpTarget,
    risk_reward: riskReward,
    mae_pips: numberOrNull(formData.get("mae_pips")),
    mfe_pips: numberOrNull(formData.get("mfe_pips")),
    result,
    memo: stringOrNull(formData.get("memo")),
    screenshot_url: stringOrNull(formData.get("screenshot_url")),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/trades");
  redirect("/trades");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PairCategory } from "@/lib/supabase/types";

export async function createCurrencyPair(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const symbol = String(formData.get("symbol") ?? "").toUpperCase().trim();
  const category = String(formData.get("category") ?? "") as PairCategory;
  if (!symbol || (category !== "dollar_straight" && category !== "cross_yen")) {
    throw new Error("通貨ペアと計算区分を入力してください");
  }

  const { error } = await supabase.from("currency_pairs").insert({
    user_id: user!.id,
    symbol,
    category,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/pairs");
}

export async function deleteCurrencyPair(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id"));
  const { error } = await supabase.from("currency_pairs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/pairs");
}

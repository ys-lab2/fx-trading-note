import { createClient } from "@/lib/supabase/server";
import NewTradeForm from "@/app/(app)/trades/new/trade-form";

export default async function NewTradePage() {
  const supabase = await createClient();
  const { data: pairs } = await supabase
    .from("currency_pairs")
    .select("*")
    .order("symbol", { ascending: true });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">トレードを記録</h1>
      <NewTradeForm pairs={pairs ?? []} />
    </div>
  );
}

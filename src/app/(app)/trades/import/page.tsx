import { createClient } from "@/lib/supabase/server";
import MaeMfeImportForm from "@/app/(app)/trades/import/import-form";

export default async function MaeMfeImportPage() {
  const supabase = await createClient();
  const [{ data: pairs }, { data: settings }] = await Promise.all([
    supabase.from("currency_pairs").select("*").order("symbol", { ascending: true }),
    supabase.from("user_settings").select("*").maybeSingle(),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold">MAE/MFE 一括インポート</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        MT5からエクスポートしたM1ロウソク足CSVを取り込み、保有期間がCSVの範囲内に収まっている
        トレード記録すべてのMAE（最大逆行）とMFE（最大含み益）を自動計算して保存します。
      </p>
      <MaeMfeImportForm pairs={pairs ?? []} initialSettings={settings ?? null} />
    </div>
  );
}

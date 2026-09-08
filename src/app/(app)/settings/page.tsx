import { createClient } from "@/lib/supabase/server";
import { saveRateApiSettings } from "@/app/(app)/settings/actions";

const inputClass =
  "w-full rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-black";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("alpha_vantage_api_key")
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">設定</h1>

      <section className="space-y-3 rounded border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-semibold">レート取得API設定</h2>
        <p className="text-xs text-black/60 dark:text-white/60">
          トレード記録の「現在レート取得」ボタンで使用します。Alpha Vantage（無料）の
          APIキーを登録してください。
        </p>
        <form action={saveRateApiSettings} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="alpha_vantage_api_key" className="text-sm font-medium">
              Alpha Vantage APIキー
            </label>
            <input
              id="alpha_vantage_api_key"
              name="alpha_vantage_api_key"
              type="text"
              defaultValue={settings?.alpha_vantage_api_key ?? ""}
              placeholder="例: ABCDEFGHIJKLMNOP"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            保存
          </button>
        </form>
      </section>
    </div>
  );
}

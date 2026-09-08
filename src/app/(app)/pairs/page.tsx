import { createClient } from "@/lib/supabase/server";
import { createCurrencyPair, deleteCurrencyPair } from "@/app/(app)/pairs/actions";

const inputClass =
  "w-full rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20 dark:bg-black";

export default async function CurrencyPairsPage() {
  const supabase = await createClient();
  const { data: pairs, error } = await supabase
    .from("currency_pairs")
    .select("*")
    .order("symbol", { ascending: true });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">通貨ペア</h1>

      <form
        action={createCurrencyPair}
        className="mb-8 flex flex-wrap items-end gap-3 rounded border border-black/10 p-4 dark:border-white/10"
      >
        <div className="space-y-1">
          <label htmlFor="symbol" className="text-sm font-medium">
            通貨ペア
          </label>
          <input
            id="symbol"
            name="symbol"
            type="text"
            required
            placeholder="USDJPY"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="category" className="text-sm font-medium">
            計算区分
          </label>
          <select id="category" name="category" required className={inputClass}>
            <option value="dollar_straight">ドルストレート</option>
            <option value="cross_yen">クロス円</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          追加
        </button>
      </form>

      {error && <p className="text-sm text-red-600">読み込みエラー: {error.message}</p>}

      {!error && pairs?.length === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          通貨ペアが登録されていません。上のフォームから追加してください。
        </p>
      )}

      {pairs && pairs.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left dark:border-white/10">
              <th className="py-2 pr-4">通貨ペア</th>
              <th className="py-2 pr-4">計算区分</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p) => (
              <tr key={p.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-4 font-medium">{p.symbol}</td>
                <td className="py-2 pr-4">
                  {p.category === "dollar_straight" ? "ドルストレート" : "クロス円"}
                </td>
                <td className="py-2 pr-4 text-right">
                  <form action={deleteCurrencyPair}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      削除
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { jstMonthRangeUtc, jstToday } from "@/lib/jst-date";
import CalendarGrid from "@/app/(app)/calendar/calendar-grid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const today = jstToday();
  const year = params.year ? Number(params.year) : today.year;
  const month = params.month ? Number(params.month) : today.month;

  const { startIso, endIso } = jstMonthRangeUtc(year, month);

  const supabase = await createClient();
  const { data: trades, error } = await supabase
    .from("trades")
    .select("id, pair, side, result, pnl_amount, closed_at")
    .not("closed_at", "is", null)
    .gte("closed_at", startIso)
    .lt("closed_at", endIso)
    .order("closed_at", { ascending: true });

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          カレンダー <span className="text-base font-normal">{year}年{month}月</span>
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
            className="rounded border border-black/20 px-3 py-1.5 dark:border-white/20"
          >
            &lt;
          </Link>
          <Link href="/calendar" className="rounded border border-black/20 px-3 py-1.5 dark:border-white/20">
            今月
          </Link>
          <Link
            href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
            className="rounded border border-black/20 px-3 py-1.5 dark:border-white/20"
          >
            &gt;
          </Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">読み込みエラー: {error.message}</p>}

      <CalendarGrid year={year} month={month} trades={trades ?? []} />
    </div>
  );
}

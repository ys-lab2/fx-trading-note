const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * These treat every timestamp as JST regardless of the server's own
 * timezone (Vercel runs in UTC), by shifting the UTC instant +9h before
 * reading its UTC date parts.
 */

export function jstDateParts(iso: string): { year: number; month: number; day: number } {
  const shifted = new Date(new Date(iso).getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** The JST calendar date ("YYYY-MM-DD") a UTC instant falls on. */
export function jstDateKey(iso: string): string {
  const { year, month, day } = jstDateParts(iso);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function jstToday(): { year: number; month: number; day: number } {
  return jstDateParts(new Date().toISOString());
}

/** [start, end) UTC ISO bounds covering a JST calendar month (month is 1-12). */
export function jstMonthRangeUtc(year: number, month: number): { startIso: string; endIso: string } {
  const startUtcMs = Date.UTC(year, month - 1, 1) - JST_OFFSET_MS;
  const endUtcMs = Date.UTC(year, month, 1) - JST_OFFSET_MS;
  return { startIso: new Date(startUtcMs).toISOString(), endIso: new Date(endUtcMs).toISOString() };
}

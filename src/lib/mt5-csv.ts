import type { Candle } from "@/lib/trade-calculations";

/**
 * Decodes an MT5-exported candle CSV. MT5's "Export" button writes UTF-16LE
 * with a BOM by default, but a plain UTF-8 file (e.g. re-saved by a text
 * editor) is also accepted.
 */
export async function decodeMt5CsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isUtf16Le = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe;
  const decoder = new TextDecoder(isUtf16Le ? "utf-16le" : "utf-8");
  return decoder.decode(buffer);
}

/**
 * Converts an MT5 candle's naive server-local timestamp ("2026.08.19 17:50")
 * into a real UTC epoch millisecond, given how many hours JST is currently
 * ahead of the MT5 server (e.g. 6 in summer, 7 in winter for a typical
 * EET/EEST broker). JST itself is a fixed UTC+9.
 */
export function mt5TimeToUtcMs(dateTimeStr: string, jstAheadOfMt5Hours: number): number | null {
  const match = dateTimeStr
    .trim()
    .match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const naiveUtcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    second ? Number(second) : 0
  );

  return naiveUtcMs + (jstAheadOfMt5Hours - 9) * 3_600_000;
}

/**
 * Parses MT5's headerless M1 export format:
 * `<DATE> <TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<TICKVOL>,<SPREAD>`
 * Returns candles sorted by time ascending.
 */
export function parseMt5Csv(text: string, jstAheadOfMt5Hours: number): Candle[] {
  const candles: Candle[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^﻿/, "").trim();
    if (!line) continue;

    const cols = line.split(",");
    if (cols.length < 5) continue;

    const timeMs = mt5TimeToUtcMs(cols[0], jstAheadOfMt5Hours);
    const high = Number(cols[2]);
    const low = Number(cols[3]);
    if (timeMs == null || !Number.isFinite(high) || !Number.isFinite(low)) continue;

    candles.push({ timeMs, high, low });
  }

  candles.sort((a, b) => a.timeMs - b.timeMs);
  return candles;
}

/** Binary-searches for the first candle index with timeMs >= target. */
function lowerBound(candles: Candle[], targetMs: number): number {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid].timeMs < targetMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Candles whose time falls within [openedAtMs, closedAtMs], inclusive. */
export function candlesInWindow(
  candles: Candle[],
  openedAtMs: number,
  closedAtMs: number
): Candle[] {
  const start = lowerBound(candles, openedAtMs);
  const result: Candle[] = [];
  for (let i = start; i < candles.length && candles[i].timeMs <= closedAtMs; i++) {
    result.push(candles[i]);
  }
  return result;
}

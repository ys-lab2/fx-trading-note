"use client";

import { useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Formats a Date as a `datetime-local` input value in local time (no timezone conversion). */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function shiftByDays(value: string, days: number): string {
  const base = value ? new Date(value) : new Date();
  if (Number.isNaN(base.getTime())) return value;
  return toLocalInputValue(new Date(base.getTime() + days * DAY_MS));
}

type Props = {
  id: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  className: string;
};

/** A `datetime-local` input with -1日/当日/+1日 shortcut buttons. */
export default function DatetimeNavInput({ id, name, required, defaultValue, className }: Props) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setValue((v) => shiftByDays(v, -1))}
        aria-label="1日前"
        className="shrink-0 rounded border border-black/20 px-2 py-2 text-sm dark:border-white/20"
      >
        &lt;
      </button>
      <input
        id={id}
        name={name}
        type="datetime-local"
        required={required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={className}
      />
      <button
        type="button"
        onClick={() => setValue(toLocalInputValue(new Date()))}
        className="shrink-0 rounded border border-black/20 px-2 py-2 text-xs whitespace-nowrap dark:border-white/20"
      >
        当日
      </button>
      <button
        type="button"
        onClick={() => setValue((v) => shiftByDays(v, 1))}
        aria-label="1日後"
        className="shrink-0 rounded border border-black/20 px-2 py-2 text-sm dark:border-white/20"
      >
        &gt;
      </button>
    </div>
  );
}

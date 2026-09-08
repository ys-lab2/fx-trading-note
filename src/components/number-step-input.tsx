"use client";

import { useState } from "react";

type Props = {
  id: string;
  name?: string;
  required?: boolean;
  /** Amount added/subtracted per button press. Also sets decimal precision for the result. */
  step?: number;
  placeholder?: string;
  className: string;
  /** Controlled mode (parent owns state). Omit both to let the component manage its own value. */
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
};

/** Native number-input spinners are tiny and hard to tap on a phone; this renders large custom +/- buttons instead. */
export default function NumberStepInput({
  id,
  name,
  required,
  step = 1,
  placeholder,
  className,
  value,
  onChange,
  defaultValue,
}: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const current = isControlled ? value : internalValue;

  function setValue(next: string) {
    if (isControlled) {
      onChange?.(next);
    } else {
      setInternalValue(next);
    }
  }

  function adjust(delta: number) {
    const base = current === "" ? 0 : Number(current);
    const next = Number.isFinite(base) ? base + delta : delta;
    const precision = Math.max(0, (String(step).split(".")[1] ?? "").length);
    setValue(next.toFixed(precision));
  }

  return (
    <div className="flex items-stretch gap-1">
      <input
        id={id}
        name={name}
        type="number"
        step="any"
        required={required}
        placeholder={placeholder}
        value={current}
        onChange={(e) => setValue(e.target.value)}
        className={`${className} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => adjust(step)}
          aria-label="増やす"
          className="flex-1 rounded-t border border-black/20 px-3 text-base leading-none active:bg-black/10 dark:border-white/20 dark:active:bg-white/10"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => adjust(-step)}
          aria-label="減らす"
          className="flex-1 rounded-b border border-t-0 border-black/20 px-3 text-base leading-none active:bg-black/10 dark:border-white/20 dark:active:bg-white/10"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonLayout = "sides" | "right";

interface Props {
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  buttonLayout?: ButtonLayout;
}

export function NumberInputField({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 1,
  buttonLayout = "sides",
}: Props) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const clamp = (n: number) => {
    let v = n;
    if (min != null && v < min) v = min;
    if (max != null && v > max) v = max;
    return v;
  };

  const increment = useCallback(() => {
    onChange(clamp((typeof value === "number" ? value : 0) + step));
  }, [value, step, min, max, onChange]);

  const decrement = useCallback(() => {
    onChange(clamp((typeof value === "number" ? value : 0) - step));
  }, [value, step, min, max, onChange]);

  const startRepeat = (action: () => void) => {
    action();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, 80);
    }, 400);
  };

  const btnClass = cn(
    "flex items-center justify-center w-9 h-9 shrink-0",
    "border border-input bg-muted/50 text-foreground",
    "hover:bg-muted active:bg-muted/80",
    "transition-colors select-none",
    "disabled:opacity-40 disabled:pointer-events-none",
  );

  const disabledDec = min != null && value !== "" && (value as number) <= min;
  const disabledInc = max != null && value !== "" && (value as number) >= max;

  const allowNegative = min == null || min < 0;

  const allowedKeys = new Set([
    "Backspace", "Delete", "Tab", "Escape", "Enter",
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End",
  ]);

  const sanitize = (raw: string): number | "" => {
    // 全角数字→半角、全角マイナス→半角
    const half = raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/ー|−|—/g, "-");
    // 数字とマイナスのみ残す
    const cleaned = half.replace(allowNegative ? /[^0-9-]/g : /[^0-9]/g, "");
    // マイナスは先頭のみ
    const normalized = cleaned.replace(/^(-?)(.*)$/, (_, sign, rest) => sign + rest.replace(/-/g, ""));
    if (normalized === "" || normalized === "-") return "";
    const num = Number(normalized);
    return Number.isNaN(num) ? "" : clamp(num);
  };

  const inputEl = (
    <input
      type="text"
      inputMode="numeric"
      value={value === "" ? "" : String(value)}
      onCompositionEnd={(e) => {
        const result = sanitize(e.currentTarget.value);
        onChange(result);
      }}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.metaKey || e.ctrlKey) return;
        if (allowedKeys.has(e.key)) return;
        if (e.key >= "0" && e.key <= "9") return;
        if (e.key === "-" && allowNegative && e.currentTarget.selectionStart === 0 && !e.currentTarget.value.includes("-")) return;
        e.preventDefault();
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text");
        const result = sanitize(text);
        if (result !== "") {
          onChange(result);
        }
      }}
      onWheel={(e) => {
        if (document.activeElement !== e.currentTarget) return;
        e.preventDefault();
        if (e.deltaY < 0) {
          increment();
        } else if (e.deltaY > 0) {
          decrement();
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
      }}
      onChange={(e) => {
        if (e.nativeEvent instanceof InputEvent && e.nativeEvent.isComposing) return;
        const raw = e.target.value;
        if (raw === "" || (raw === "-" && allowNegative)) {
          onChange("");
          return;
        }
        const result = sanitize(raw);
        onChange(result);
      }}
      placeholder={placeholder}
      className={cn(
        "h-9 w-full min-w-0 border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none md:text-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        buttonLayout === "sides" ? "text-center" : "text-left rounded-l-md",
      )}
    />
  );

  if (buttonLayout === "right") {
    return (
      <div className="flex items-center">
        {inputEl}
        <button
          type="button"
          className={cn(btnClass, "border-l-0")}
          disabled={disabledDec}
          onPointerDown={() => startRepeat(decrement)}
          onPointerUp={clearTimers}
          onPointerLeave={clearTimers}
          tabIndex={-1}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(btnClass, "rounded-r-md border-l-0")}
          disabled={disabledInc}
          onPointerDown={() => startRepeat(increment)}
          onPointerUp={clearTimers}
          onPointerLeave={clearTimers}
          tabIndex={-1}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        className={cn(btnClass, "rounded-l-md border-r-0")}
        disabled={disabledDec}
        onPointerDown={() => startRepeat(decrement)}
        onPointerUp={clearTimers}
        onPointerLeave={clearTimers}
        tabIndex={-1}
      >
        <Minus className="h-4 w-4" />
      </button>
      {inputEl}
      <button
        type="button"
        className={cn(btnClass, "rounded-r-md border-l-0")}
        disabled={disabledInc}
        onPointerDown={() => startRepeat(increment)}
        onPointerUp={clearTimers}
        onPointerLeave={clearTimers}
        tabIndex={-1}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

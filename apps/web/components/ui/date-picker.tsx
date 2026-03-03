"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * カスタム日付ピッカー
 * ネイティブ<input type="date">と異なり、月移動時にカレンダーが閉じない
 */
export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) {
      const [y] = value.split("-");
      return parseInt(y, 10);
    }
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const parts = value.split("-");
      return parseInt(parts[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  // value が変わったらカレンダーの表示月を追従
  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-");
      setViewYear(parseInt(y, 10));
      setViewMonth(parseInt(m, 10) - 1);
    }
  }, [value]);

  // ポップオーバーの位置を計算
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 4,
      left: rect.right,
    });
  }, [isOpen]);

  // クリック外で閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const prevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const selectDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  // カレンダーグリッドの生成
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 表示用の日付フォーマット
  const displayValue = value
    ? value.replace(/-/g, "/")
    : "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-2 py-1 text-sm border border-input rounded-md bg-background text-foreground text-left tabular-nums",
          className,
        )}
      >
        {displayValue}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-[280px] bg-card border border-border rounded-lg shadow-lg p-3"
            style={{
              top: popoverPos.top,
              left: popoverPos.left,
              transform: "translateX(-100%)",
            }}
          >
            {/* 月ナビゲーション */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <FaChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {viewYear}年{viewMonth + 1}月
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* 曜日ヘッダー + 日付グリッド */}
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS_JA.map((d) => (
                <div
                  key={d}
                  className="h-8 flex items-center justify-center text-xs text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`e${i}`} />
              ))}
              {days.map((day) => {
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = dateStr === value;
                const isToday =
                  dateStr ===
                  new Intl.DateTimeFormat("sv-SE", {
                    timeZone: "Asia/Tokyo",
                  }).format(new Date());

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={cn(
                      "h-8 rounded text-sm transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isToday
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground hover:bg-muted",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

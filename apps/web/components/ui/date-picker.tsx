"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  /** ポータル先のコンテナ要素（Dialog内で使う場合に指定） */
  container?: HTMLElement | null;
}

interface HolidayInfo {
  date: string;
  name: string;
}

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * カスタム日付ピッカー
 * ネイティブ<input type="date">と異なり、月移動時にカレンダーが閉じない
 */
export function DatePicker({ value, onChange, className, min, max, container }: DatePickerProps) {
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

  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
  const fetchedMonths = useRef<Set<string>>(new Set());

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

  // 祝日データの取得
  useEffect(() => {
    const key = `${viewYear}-${viewMonth}`;
    if (fetchedMonths.current.has(key)) return;
    fetchedMonths.current.add(key);

    const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    fetch(`/api/calendar/holidays?startDate=${startDate}&endDate=${endDate}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.holidays) return;
        setHolidays((prev) => {
          const next = new Map(prev);
          for (const h of data.holidays as HolidayInfo[]) {
            next.set(h.date, h.name);
          }
          return next;
        });
      })
      .catch(() => {});
  }, [viewYear, viewMonth]);

  // ポップオーバーの位置を計算（画面内に収まるように調整）
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 320;
    const popoverWidth = 280;
    const margin = 8;

    let top: number;
    if (rect.bottom + popoverHeight + margin > window.innerHeight) {
      top = rect.top - popoverHeight - 4;
    } else {
      top = rect.bottom + 4;
    }

    let left = rect.right;
    if (left - popoverWidth < margin) {
      left = rect.left + popoverWidth;
    }
    if (left > window.innerWidth - margin) {
      left = window.innerWidth - margin;
    }

    setPopoverPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

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

  const isDateDisabled = (dateStr: string) => {
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const selectDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isDateDisabled(dateStr)) return;
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
          "flex items-center gap-2 px-2 py-1 text-sm border border-input rounded-md bg-background text-left tabular-nums",
          value ? "text-foreground" : "text-muted-foreground",
          className,
        )}
      >
        <FaCalendarAlt className="w-3.5 h-3.5 shrink-0" />
        {displayValue || "----/--/--"}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[9999] w-[280px] bg-card border border-border rounded-lg shadow-lg p-3 pointer-events-auto"
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
                  className={cn(
                    "h-8 flex items-center justify-center text-xs",
                    d === "日" ? "text-red-500" : d === "土" ? "text-blue-500" : "text-muted-foreground",
                  )}
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
                const disabled = isDateDisabled(dateStr);
                const isToday =
                  dateStr ===
                  new Intl.DateTimeFormat("sv-SE", {
                    timeZone: "Asia/Tokyo",
                  }).format(new Date());
                const holidayName = holidays.get(dateStr);
                const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectDay(day)}
                    title={holidayName || undefined}
                    className={cn(
                      "h-8 rounded text-sm transition-colors relative",
                      disabled
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : isSelected
                          ? "bg-primary text-primary-foreground"
                          : isToday
                            ? "bg-accent text-accent-foreground font-medium"
                            : holidayName || isSunday
                              ? "text-red-500 hover:bg-muted"
                              : isSaturday
                                ? "text-blue-500 hover:bg-muted"
                                : "text-foreground hover:bg-muted",
                    )}
                  >
                    {day}
                    {holidayName && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          container || document.body,
        )}
    </>
  );
}

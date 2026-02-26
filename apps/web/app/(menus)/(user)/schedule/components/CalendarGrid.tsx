import { useMemo } from "react";
import type { Language } from "../translations";
import {
  type CalendarEvent,
  type CompanyEvent,
  type Holiday,
  CATEGORY_COLORS,
  COMPANY_EVENT_COLORS,
  formatDateKey,
  getCalendarDays,
  getDualMonthGrid,
} from "./calendar-types";

interface CalendarGridProps {
  year: number;
  month: number;
  viewMode: "single" | "dual";
  language: Language;
  selectedDay: number | null;
  selectedMonth: "current" | "next";
  eventsByDate: Record<string, CalendarEvent[]>;
  holidaysByDate: Record<string, Holiday[]>;
  companyEventsByDate: Record<string, CompanyEvent[]>;
  todayKey: string;
  weekdays: string[];
  onSelectDay: (day: number, which: "current" | "next") => void;
}

export function CalendarGrid({
  year,
  month,
  viewMode,
  language,
  selectedDay,
  selectedMonth,
  eventsByDate,
  holidaysByDate,
  companyEventsByDate,
  todayKey,
  weekdays,
  onSelectDay,
}: CalendarGridProps) {
  const singleGrid = useMemo(
    () => getCalendarDays(year, month),
    [year, month],
  );
  const dualGrid = useMemo(
    () => getDualMonthGrid(year, month),
    [year, month],
  );

  return (
    <div className="border rounded-lg overflow-hidden shrink-0">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekdays.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-sm font-medium py-2 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {viewMode === "single"
          ? singleGrid.map((day, idx) => (
              <SingleDayCell
                key={day !== null ? formatDateKey(year, month, day) : `empty-${idx}`}
                day={day}
                idx={idx}
                year={year}
                month={month}
                language={language}
                selectedDay={selectedDay}
                selectedMonth={selectedMonth}
                eventsByDate={eventsByDate}
                holidaysByDate={holidaysByDate}
                companyEventsByDate={companyEventsByDate}
                todayKey={todayKey}
                onSelectDay={onSelectDay}
              />
            ))
          : dualGrid.map((cell, idx) => (
              <DualDayCell
                key={`cell-${idx}`}
                cell={cell}
                idx={idx}
                language={language}
                selectedDay={selectedDay}
                selectedMonth={selectedMonth}
                eventsByDate={eventsByDate}
                holidaysByDate={holidaysByDate}
                companyEventsByDate={companyEventsByDate}
                todayKey={todayKey}
                onSelectDay={onSelectDay}
              />
            ))}
      </div>
    </div>
  );
}

// --- Single month cell ---

interface SingleDayCellProps {
  day: number | null;
  idx: number;
  year: number;
  month: number;
  language: Language;
  selectedDay: number | null;
  selectedMonth: "current" | "next";
  eventsByDate: Record<string, CalendarEvent[]>;
  holidaysByDate: Record<string, Holiday[]>;
  companyEventsByDate: Record<string, CompanyEvent[]>;
  todayKey: string;
  onSelectDay: (day: number, which: "current" | "next") => void;
}

function SingleDayCell({
  day,
  idx,
  year,
  month,
  language,
  selectedDay,
  selectedMonth,
  eventsByDate,
  holidaysByDate,
  companyEventsByDate,
  todayKey,
  onSelectDay,
}: SingleDayCellProps) {
  if (day === null) {
    return (
      <div className="min-h-[80px] border-b border-r bg-muted/20" />
    );
  }

  const dateKey = formatDateKey(year, month, day);
  const dayOfWeek = idx % 7;
  const isToday = dateKey === todayKey;
  const isSelected = selectedMonth === "current" && day === selectedDay;
  const dayHolidays = holidaysByDate[dateKey] ?? [];
  const dayEvents = eventsByDate[dateKey] ?? [];
  const dayCompanyEvents = companyEventsByDate[dateKey] ?? [];
  const isHoliday = dayHolidays.length > 0;
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  const allDots = [
    ...dayEvents.map((ev) => ({ id: ev.id, color: CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.other })),
    ...dayCompanyEvents.map((ev) => ({ id: `ce-${ev.id}`, color: COMPANY_EVENT_COLORS[ev.category] ?? "bg-teal-400" })),
  ];

  return (
    <button
      type="button"
      className={`min-h-[80px] border-b border-r p-1 flex flex-col transition-colors hover:bg-accent/50 cursor-pointer ${
        isSelected ? "bg-accent" : ""
      } ${isToday ? "bg-primary/5" : ""}`}
      onClick={() => onSelectDay(day, "current")}
    >
      <div className="text-left">
        <div className="flex items-center gap-0.5">
          <span
            className={`text-sm font-medium inline-flex items-center justify-center ${
              isToday
                ? "bg-gray-900 text-white rounded-full w-6 h-6 leading-none dark:bg-gray-100 dark:text-gray-900"
                : isSunday || isHoliday
                  ? "text-red-500"
                  : isSaturday
                    ? "text-blue-500"
                    : ""
            }`}
          >
            {day}
          </span>
          {allDots.slice(0, 3).map((dot) => (
            <span
              key={dot.id}
              className={`w-1.5 h-1.5 rounded-full ${dot.color}`}
            />
          ))}
          {allDots.length > 3 && (
            <span className="text-[8px] text-muted-foreground">
              +{allDots.length - 3}
            </span>
          )}
        </div>
        {dayHolidays.map((h) => (
          <div
            key={h.id}
            className="text-[10px] text-red-500 truncate leading-tight"
          >
            {language === "ja" ? h.name : (h.nameEn ?? h.name)}
          </div>
        ))}
      </div>
    </button>
  );
}

// --- Dual month cell ---

interface DualDayCellProps {
  cell: ReturnType<typeof getDualMonthGrid>[number];
  idx: number;
  language: Language;
  selectedDay: number | null;
  selectedMonth: "current" | "next";
  eventsByDate: Record<string, CalendarEvent[]>;
  holidaysByDate: Record<string, Holiday[]>;
  companyEventsByDate: Record<string, CompanyEvent[]>;
  todayKey: string;
  onSelectDay: (day: number, which: "current" | "next") => void;
}

function DualDayCell({
  cell,
  idx,
  language,
  selectedDay,
  selectedMonth,
  eventsByDate,
  holidaysByDate,
  companyEventsByDate,
  todayKey,
  onSelectDay,
}: DualDayCellProps) {
  const hasCurrent = cell.currentDay !== null;
  const hasNext = cell.nextDay !== null;
  const isEmpty = !hasCurrent && !hasNext;

  if (isEmpty) {
    return (
      <div className="min-h-[80px] border-b border-r bg-muted/20" />
    );
  }

  const currentEvents = cell.currentDateKey
    ? (eventsByDate[cell.currentDateKey] ?? [])
    : [];
  const nextEvents = cell.nextDateKey
    ? (eventsByDate[cell.nextDateKey] ?? [])
    : [];
  const currentCompanyEvents = cell.currentDateKey
    ? (companyEventsByDate[cell.currentDateKey] ?? [])
    : [];
  const nextCompanyEvents = cell.nextDateKey
    ? (companyEventsByDate[cell.nextDateKey] ?? [])
    : [];
  const currentHolidays = cell.currentDateKey
    ? (holidaysByDate[cell.currentDateKey] ?? [])
    : [];
  const nextHolidays = cell.nextDateKey
    ? (holidaysByDate[cell.nextDateKey] ?? [])
    : [];

  const currentDots = [
    ...currentEvents.map((ev) => ({ id: ev.id, color: CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.other })),
    ...currentCompanyEvents.map((ev) => ({ id: `ce-${ev.id}`, color: COMPANY_EVENT_COLORS[ev.category] ?? "bg-teal-400" })),
  ];
  const nextDots = [
    ...nextEvents.map((ev) => ({ id: ev.id, color: CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.other })),
    ...nextCompanyEvents.map((ev) => ({ id: `ce-${ev.id}`, color: COMPANY_EVENT_COLORS[ev.category] ?? "bg-teal-400" })),
  ];

  const isTodayCurrent = cell.currentDateKey === todayKey;
  const isTodayNext = cell.nextDateKey === todayKey;
  const isSelectedCurrent =
    selectedMonth === "current" && selectedDay === cell.currentDay;
  const isSelectedNext =
    selectedMonth === "next" && selectedDay === cell.nextDay;

  const isSunday = cell.dayOfWeek === 0;
  const isSaturday = cell.dayOfWeek === 6;

  return (
    <div className="min-h-[80px] border-b border-r relative dual-month-cell">
      {/* Upper-left triangle: current month */}
      {hasCurrent ? (
        <button
          type="button"
          className={`absolute inset-0 clip-upper-left p-1 flex flex-col items-start cursor-pointer transition-colors hover:bg-accent/30 ${
            isSelectedCurrent ? "bg-accent/50" : ""
          } ${isTodayCurrent ? "bg-primary/5" : ""}`}
          onClick={() => onSelectDay(cell.currentDay!, "current")}
        >
          <div className="flex items-center gap-0.5">
            <span
              className={`text-base font-bold inline-flex items-center justify-center ${
                isTodayCurrent
                  ? "bg-gray-900 text-white rounded-full w-7 h-7 leading-none dark:bg-gray-100 dark:text-gray-900"
                  : isSunday || currentHolidays.length > 0
                    ? "text-red-500"
                    : isSaturday
                      ? "text-blue-500"
                      : ""
              }`}
            >
              {cell.currentDay}
            </span>
            {currentDots.slice(0, 2).map((dot) => (
              <span
                key={dot.id}
                className={`w-1.5 h-1.5 rounded-full ${dot.color}`}
              />
            ))}
            {currentDots.length > 2 && (
              <span className="text-[8px] text-muted-foreground">
                +{currentDots.length - 2}
              </span>
            )}
          </div>
          {currentHolidays.slice(0, 1).map((h) => (
            <span
              key={h.id}
              className="text-[9px] text-red-500 truncate leading-tight max-w-[60%]"
            >
              {language === "ja" ? h.name : (h.nameEn ?? h.name)}
            </span>
          ))}
        </button>
      ) : (
        <div className="absolute inset-0 clip-upper-left bg-muted/30" />
      )}

      {/* Lower-right triangle: next month */}
      {hasNext ? (
        <button
          type="button"
          className={`absolute inset-0 clip-lower-right p-1 flex flex-col items-end justify-end cursor-pointer transition-colors hover:bg-accent/30 ${
            isSelectedNext ? "bg-accent/50" : ""
          } ${isTodayNext ? "bg-primary/5" : ""}`}
          onClick={() => onSelectDay(cell.nextDay!, "next")}
        >
          {nextHolidays.slice(0, 1).map((h) => (
            <span
              key={h.id}
              className="text-[9px] text-red-500 truncate leading-tight max-w-[60%]"
            >
              {language === "ja" ? h.name : (h.nameEn ?? h.name)}
            </span>
          ))}
          <div className="flex items-center gap-0.5">
            {nextDots.slice(0, 2).map((dot) => (
              <span
                key={dot.id}
                className={`w-1.5 h-1.5 rounded-full ${dot.color}`}
              />
            ))}
            {nextDots.length > 2 && (
              <span className="text-[8px] text-muted-foreground">
                +{nextDots.length - 2}
              </span>
            )}
            <span
              className={`text-sm font-medium opacity-50 inline-flex items-center justify-center ${
                isTodayNext
                  ? "bg-gray-900 text-white rounded-full w-6 h-6 leading-none opacity-100 dark:bg-gray-100 dark:text-gray-900"
                  : isSunday || nextHolidays.length > 0
                    ? "text-red-500"
                    : isSaturday
                      ? "text-blue-500"
                      : "text-foreground"
              }`}
            >
              {cell.nextDay}
            </span>
          </div>
        </button>
      ) : (
        <div className="absolute inset-0 clip-lower-right bg-muted/30" />
      )}
    </div>
  );
}

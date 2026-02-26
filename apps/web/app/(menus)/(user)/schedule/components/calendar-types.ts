import type { scheduleTranslations, Language } from "../translations";

// Types
export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  category: string;
  color: string | null;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  nameEn: string | null;
  type: string;
}

export interface EventFormData {
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  category: string;
}

export interface DualMonthCell {
  currentDay: number | null;
  nextDay: number | null;
  currentDateKey: string | null;
  nextDateKey: string | null;
  dayOfWeek: number;
}

export type Translations = (typeof scheduleTranslations)[Language];

// Constants
export const CATEGORY_COLORS: Record<string, string> = {
  personal: "bg-yellow-300",
  work: "bg-orange-300",
  meeting: "bg-blue-300",
  visitor: "bg-purple-300",
  trip: "bg-pink-300",
  other: "bg-gray-500",
};

export const INITIAL_FORM: EventFormData = {
  title: "",
  description: "",
  location: "",
  allDay: false,
  startTime: "",
  endTime: "",
  category: "work",
};

// Utility functions
export function formatDateKey(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getCalendarDays(
  year: number,
  month: number,
): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function getDualMonthGrid(
  year: number,
  month: number,
): DualMonthCell[] {
  const firstDayCurrent = new Date(year, month, 1).getDay();
  const daysInCurrent = new Date(year, month + 1, 0).getDate();

  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const firstDayNext = new Date(nextYear, nextMonth, 1).getDay();
  const daysInNext = new Date(nextYear, nextMonth + 1, 0).getDate();

  const rowsCurrent = Math.ceil((firstDayCurrent + daysInCurrent) / 7);
  const rowsNext = Math.ceil((firstDayNext + daysInNext) / 7);
  const totalRows = Math.max(rowsCurrent, rowsNext);

  const cells: DualMonthCell[] = [];

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < 7; col++) {
      const idx = row * 7 + col;

      const currentIdx = idx - firstDayCurrent;
      const currentDay =
        currentIdx >= 0 && currentIdx < daysInCurrent ? currentIdx + 1 : null;

      const nextIdx = idx - firstDayNext;
      const nextDay =
        nextIdx >= 0 && nextIdx < daysInNext ? nextIdx + 1 : null;

      cells.push({
        currentDay,
        nextDay,
        currentDateKey: currentDay
          ? formatDateKey(year, month, currentDay)
          : null,
        nextDateKey: nextDay
          ? formatDateKey(nextYear, nextMonth, nextDay)
          : null,
        dayOfWeek: col,
      });
    }
  }

  return cells;
}

export function toLocalDatetimeValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

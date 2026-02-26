"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Bot, ChevronLeft, ChevronRight } from "lucide-react";
import { scheduleTranslations, type Language } from "./translations";
import { ScheduleConcierge } from "./ScheduleConcierge";

// Types
interface CalendarEvent {
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

interface Holiday {
  id: string;
  date: string;
  name: string;
  nameEn: string | null;
  type: string;
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  category: string;
}

interface DualMonthCell {
  currentDay: number | null;
  nextDay: number | null;
  currentDateKey: string | null;
  nextDateKey: string | null;
  dayOfWeek: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  personal: "bg-yellow-300",
  work: "bg-orange-300",
  meeting: "bg-blue-300",
  visitor: "bg-purple-300",
  trip: "bg-pink-300",
  other: "bg-gray-500",
};

const INITIAL_FORM: EventFormData = {
  title: "",
  description: "",
  location: "",
  allDay: false,
  startTime: "",
  endTime: "",
  category: "work",
};

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getDualMonthGrid(year: number, month: number): DualMonthCell[] {
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

function toLocalDatetimeValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface ScheduleClientProps {
  language: Language;
}

export function ScheduleClient({ language }: ScheduleClientProps) {
  const t = scheduleTranslations[language];

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [selectedMonth, setSelectedMonth] = useState<"current" | "next">(
    "current",
  );
  const [viewMode, setViewMode] = useState<"single" | "dual">("dual");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Concierge panel state
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useEffect(() => {
    setPortalTarget(document.querySelector('[data-slot="sidebar-wrapper"]'));
  }, []);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const todayKey = useMemo(() => {
    const n = new Date();
    return formatDateKey(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  // Next month year/month
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonthNum = month === 11 ? 0 : month + 1;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDayNext = new Date(nextYear, nextMonthNum + 1, 0).getDate();
    const endDate = `${nextYear}-${String(nextMonthNum + 1).padStart(2, "0")}-${String(lastDayNext).padStart(2, "0")}`;

    try {
      const [eventsRes, holidaysRes] = await Promise.all([
        fetch(
          `/api/calendar/app-events?startDate=${startDate}&endDate=${endDate}`,
        ),
        fetch(
          `/api/calendar/holidays?startDate=${startDate}&endDate=${endDate}&type=all`,
        ),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events ?? []);
      }
      if (holidaysRes.ok) {
        const data = await holidaysRes.json();
        setHolidays(data.holidays ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month, nextYear, nextMonthNum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group events and holidays by date key
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = new Date(ev.startTime).toISOString().split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const holidaysByDate = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    for (const h of holidays) {
      if (!map[h.date]) map[h.date] = [];
      map[h.date].push(h);
    }
    return map;
  }, [holidays]);

  const dualGrid = useMemo(
    () => getDualMonthGrid(year, month),
    [year, month],
  );
  const singleGrid = useMemo(
    () => getCalendarDays(year, month),
    [year, month],
  );
  const weekdays = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

  // Navigation
  const goToPrevMonth = useCallback(() => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
    setSelectedMonth("current");
  }, [month]);

  const goToNextMonth = useCallback(() => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
    setSelectedMonth("current");
  }, [month]);

  const goToToday = useCallback(() => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDay(n.getDate());
    setSelectedMonth("current");
  }, []);

  // Month title
  const monthTitle = useMemo(() => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    if (viewMode === "single") {
      if (language === "ja") return `${year}年 ${month + 1}月`;
      return `${monthNames[month]} ${year}`;
    }
    let main: string;
    let sub: string;
    if (language === "ja") {
      main = `${year}年 ${month + 1}月`;
      sub =
        nextYear !== year
          ? `/ ${nextYear}年${nextMonthNum + 1}月`
          : `/ ${nextMonthNum + 1}月`;
    } else {
      main =
        nextYear !== year
          ? `${monthNames[month]} ${year}`
          : `${monthNames[month]}`;
      sub =
        nextYear !== year
          ? `/ ${monthNames[nextMonthNum]} ${nextYear}`
          : `/ ${monthNames[nextMonthNum]} ${year}`;
    }
    return (
      <>
        {main}{" "}
        <span className="text-sm font-normal text-muted-foreground">{sub}</span>
      </>
    );
  }, [year, month, nextYear, nextMonthNum, language, viewMode]);

  // Selected day data
  const selectedDateKey = useMemo(() => {
    if (!selectedDay) return null;
    if (selectedMonth === "next") {
      return formatDateKey(nextYear, nextMonthNum, selectedDay);
    }
    return formatDateKey(year, month, selectedDay);
  }, [selectedDay, selectedMonth, year, month, nextYear, nextMonthNum]);

  const selectedEvents = selectedDateKey
    ? (eventsByDate[selectedDateKey] ?? [])
    : [];
  const selectedHolidays = selectedDateKey
    ? (holidaysByDate[selectedDateKey] ?? [])
    : [];

  // Day label for detail panel
  const selectedDayLabel = useMemo(() => {
    if (!selectedDay) return "";
    const selYear = selectedMonth === "next" ? nextYear : year;
    const selMonth = selectedMonth === "next" ? nextMonthNum : month;
    const d = new Date(selYear, selMonth, selectedDay);
    const dayOfWeek = weekdays[d.getDay()];
    if (language === "ja") {
      return `${selMonth + 1}月${selectedDay}日(${dayOfWeek})`;
    }
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[selMonth]} ${selectedDay} (${dayOfWeek})`;
  }, [
    selectedDay,
    selectedMonth,
    year,
    month,
    nextYear,
    nextMonthNum,
    language,
    weekdays,
  ]);

  // Event form handlers
  const openAddDialog = useCallback(() => {
    const selYear = selectedMonth === "next" ? nextYear : year;
    const selMonth = selectedMonth === "next" ? nextMonthNum : month;
    const baseDate = selectedDay
      ? new Date(selYear, selMonth, selectedDay, 9, 0)
      : new Date(year, month, 1, 9, 0);
    const endDate = new Date(baseDate);
    endDate.setHours(endDate.getHours() + 1);

    setEditingEvent(null);
    setForm({
      ...INITIAL_FORM,
      startTime: toLocalDatetimeValue(baseDate),
      endTime: toLocalDatetimeValue(endDate),
    });
    setDialogOpen(true);
  }, [selectedDay, selectedMonth, year, month, nextYear, nextMonthNum]);

  const openEditDialog = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      allDay: event.allDay,
      startTime: toLocalDatetimeValue(new Date(event.startTime)),
      endTime: toLocalDatetimeValue(new Date(event.endTime)),
      category: event.category,
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    const body = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      allDay: form.allDay,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      category: form.category,
    };

    try {
      if (editingEvent) {
        await fetch(`/api/calendar/app-events/${editingEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/calendar/app-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setDialogOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }, [form, editingEvent, fetchData]);

  const handleDelete = useCallback(async () => {
    if (!editingEvent) return;
    setSaving(true);
    try {
      await fetch(`/api/calendar/app-events/${editingEvent.id}`, {
        method: "DELETE",
      });
      setDeleteConfirmOpen(false);
      setDialogOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }, [editingEvent, fetchData]);

  const categoryLabel = useCallback(
    (cat: string) => {
      const map: Record<string, string> = {
        personal: t.categoryPersonal,
        work: t.categoryWork,
        meeting: t.categoryMeeting,
        visitor: t.categoryVisitor,
        trip: t.categoryTrip,
        other: t.categoryOther,
      };
      return map[cat] ?? cat;
    },
    [t],
  );

  if (loading && events.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100svh-8rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevMonth}
            aria-label={t.prevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {monthTitle}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            aria-label={t.nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t.today}
          </Button>
          <div className="flex border rounded-md overflow-hidden ml-2">
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "single"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => {
                setViewMode("single");
                setSelectedMonth("current");
              }}
            >
              1
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-medium transition-colors border-l ${
                viewMode === "dual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => setViewMode("dual")}
            >
              2
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
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
            ? singleGrid.map((day, idx) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[80px] border-b border-r bg-muted/20"
                    />
                  );
                }

                const dateKey = formatDateKey(year, month, day);
                const dayOfWeek = idx % 7;
                const isToday = dateKey === todayKey;
                const isSelected =
                  selectedMonth === "current" && day === selectedDay;
                const dayHolidays = holidaysByDate[dateKey] ?? [];
                const dayEvents = eventsByDate[dateKey] ?? [];
                const isHoliday = dayHolidays.length > 0;
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;

                return (
                  <button
                    type="button"
                    key={dateKey}
                    className={`min-h-[80px] border-b border-r p-1 flex flex-col transition-colors hover:bg-accent/50 cursor-pointer ${
                      isSelected ? "bg-accent" : ""
                    } ${isToday ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      setSelectedDay(day);
                      setSelectedMonth("current");
                    }}
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
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.other}`}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                      {dayHolidays.map((h) => (
                        <div
                          key={h.id}
                          className="text-[10px] text-red-500 truncate leading-tight"
                        >
                          {language === "ja"
                            ? h.name
                            : (h.nameEn ?? h.name)}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })
            : dualGrid.map((cell, idx) => {
                const hasCurrent = cell.currentDay !== null;
                const hasNext = cell.nextDay !== null;
                const isEmpty = !hasCurrent && !hasNext;

                if (isEmpty) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[80px] border-b border-r bg-muted/20"
                    />
                  );
                }

                const currentEvents = cell.currentDateKey
                  ? (eventsByDate[cell.currentDateKey] ?? [])
                  : [];
                const nextEvents = cell.nextDateKey
                  ? (eventsByDate[cell.nextDateKey] ?? [])
                  : [];
                const currentHolidays = cell.currentDateKey
                  ? (holidaysByDate[cell.currentDateKey] ?? [])
                  : [];
                const nextHolidays = cell.nextDateKey
                  ? (holidaysByDate[cell.nextDateKey] ?? [])
                  : [];

                const isTodayCurrent = cell.currentDateKey === todayKey;
                const isTodayNext = cell.nextDateKey === todayKey;
                const isSelectedCurrent =
                  selectedMonth === "current" &&
                  selectedDay === cell.currentDay;
                const isSelectedNext =
                  selectedMonth === "next" && selectedDay === cell.nextDay;

                const isSunday = cell.dayOfWeek === 0;
                const isSaturday = cell.dayOfWeek === 6;

                return (
                  <div
                    key={`cell-${idx}`}
                    className="min-h-[80px] border-b border-r relative dual-month-cell"
                  >
                    {/* Upper-left triangle: current month */}
                    {hasCurrent ? (
                      <button
                        type="button"
                        className={`absolute inset-0 clip-upper-left p-1 flex flex-col items-start cursor-pointer transition-colors hover:bg-accent/30 ${
                          isSelectedCurrent ? "bg-accent/50" : ""
                        } ${isTodayCurrent ? "bg-primary/5" : ""}`}
                        onClick={() => {
                          setSelectedDay(cell.currentDay);
                          setSelectedMonth("current");
                        }}
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
                          {currentEvents.slice(0, 2).map((ev) => (
                            <span
                              key={ev.id}
                              className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.other}`}
                            />
                          ))}
                          {currentEvents.length > 2 && (
                            <span className="text-[8px] text-muted-foreground">
                              +{currentEvents.length - 2}
                            </span>
                          )}
                        </div>
                        {currentHolidays.slice(0, 1).map((h) => (
                          <span
                            key={h.id}
                            className="text-[9px] text-red-500 truncate leading-tight max-w-[60%]"
                          >
                            {language === "ja"
                              ? h.name
                              : (h.nameEn ?? h.name)}
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
                        onClick={() => {
                          setSelectedDay(cell.nextDay);
                          setSelectedMonth("next");
                        }}
                      >
                        {nextHolidays.slice(0, 1).map((h) => (
                          <span
                            key={h.id}
                            className="text-[9px] text-red-500 truncate leading-tight max-w-[60%]"
                          >
                            {language === "ja"
                              ? h.name
                              : (h.nameEn ?? h.name)}
                          </span>
                        ))}
                        <div className="flex items-center gap-0.5">
                          {nextEvents.slice(0, 2).map((ev) => (
                            <span
                              key={ev.id}
                              className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.other}`}
                            />
                          ))}
                          {nextEvents.length > 2 && (
                            <span className="text-[8px] text-muted-foreground">
                              +{nextEvents.length - 2}
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
              })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="border rounded-lg p-4 flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{selectedDayLabel}</h3>
            <Button size="sm" onClick={openAddDialog}>
              + {t.addEvent}
            </Button>
          </div>

          {selectedHolidays.length === 0 && selectedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.noEvents}</p>
          )}

          <div className="space-y-2">
            {/* Holidays */}
            {selectedHolidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 text-sm py-2 px-3 rounded bg-red-50 dark:bg-red-950/20"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {language === "ja" ? h.name : (h.nameEn ?? h.name)}
                </span>
                <span className="text-muted-foreground text-xs">
                  ({t.holiday})
                </span>
              </div>
            ))}

            {/* Events */}
            {selectedEvents.map((ev) => (
              <button
                type="button"
                key={ev.id}
                className="w-full flex items-center gap-2 text-sm py-2 px-3 rounded hover:bg-accent transition-colors cursor-pointer text-left"
                onClick={() => openEditDialog(ev)}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.other}`}
                />
                <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                  {ev.allDay
                    ? t.allDay
                    : `${formatTime(ev.startTime)}-${formatTime(ev.endTime)}`}
                </span>
                <span className="truncate">{ev.title}</span>
                <span className="text-muted-foreground text-xs ml-auto whitespace-nowrap">
                  [{categoryLabel(ev.category)}]
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? t.editEvent : t.addEvent}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">{t.eventTitle}</Label>
              <Input
                id="event-title"
                placeholder={t.eventTitlePlaceholder}
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">{t.eventDescription}</Label>
              <Textarea
                id="event-description"
                placeholder={t.eventDescriptionPlaceholder}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">{t.eventLocation}</Label>
              <Input
                id="event-location"
                placeholder={t.eventLocationPlaceholder}
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="event-allday"
                checked={form.allDay}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, allDay: checked }))
                }
              />
              <Label htmlFor="event-allday">{t.allDay}</Label>
            </div>

            {!form.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-start">{t.startDateTime}</Label>
                  <Input
                    id="event-start"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end">{t.endDateTime}</Label>
                  <Input
                    id="event-end"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endTime: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {form.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-start-date">{t.startDateTime}</Label>
                  <Input
                    id="event-start-date"
                    type="date"
                    value={form.startTime.split("T")[0]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        startTime: `${e.target.value}T00:00`,
                        endTime: `${e.target.value}T23:59`,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end-date">{t.endDateTime}</Label>
                  <Input
                    id="event-end-date"
                    type="date"
                    value={form.endTime.split("T")[0]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        endTime: `${e.target.value}T23:59`,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t.category}</Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, category: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "work",
                      "meeting",
                      "visitor",
                      "trip",
                      "personal",
                      "other",
                    ] as const
                  ).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_COLORS[cat]}`}
                        />
                        {categoryLabel(cat)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            {editingEvent && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={saving}
              >
                {t.delete}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.deleteEvent}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.deleteConfirm}</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={saving}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concierge right panel — portal into sidebar-wrapper flex */}
      {portalTarget &&
        createPortal(
          <div
            className={`shrink-0 border-l bg-background transition-[width] duration-200 overflow-hidden ${
              conciergeOpen ? "w-80" : "w-10"
            }`}
          >
            <div
              className={`sticky top-0 h-svh flex flex-col pt-16 ${conciergeOpen ? "w-80" : "w-10"}`}
            >
              <div className="flex-1 min-h-0">
                {conciergeOpen ? (
                  <ScheduleConcierge
                    language={language}
                    year={year}
                    month={month}
                    onClose={() => setConciergeOpen(false)}
                  />
                ) : (
                  <button
                    type="button"
                    className="w-full h-full flex flex-col items-center pt-4 gap-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setConciergeOpen(true)}
                  >
                    <Bot className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground [writing-mode:vertical-rl]">
                      {t.concierge}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );
}

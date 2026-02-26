"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Bot } from "lucide-react";
import { scheduleTranslations, type Language } from "./translations";
import { ScheduleConcierge } from "./ScheduleConcierge";
import {
  type CalendarEvent,
  type EventFormData,
  type Holiday,
  INITIAL_FORM,
  formatDateKey,
  toLocalDatetimeValue,
} from "./components/calendar-types";
import { CalendarHeader } from "./components/CalendarHeader";
import { CalendarGrid } from "./components/CalendarGrid";
import { DayDetailPanel } from "./components/DayDetailPanel";
import { EventFormDialog } from "./components/EventFormDialog";

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

  const weekdays = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];

  // --- Data fetching ---
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

  // --- Derived data ---
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
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${monthNames[selMonth]} ${selectedDay} (${dayOfWeek})`;
  }, [
    selectedDay, selectedMonth, year, month,
    nextYear, nextMonthNum, language, weekdays,
  ]);

  // --- Navigation ---
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

  const handleViewModeChange = useCallback((mode: "single" | "dual") => {
    setViewMode(mode);
    if (mode === "single") {
      setSelectedMonth("current");
    }
  }, []);

  const handleSelectDay = useCallback(
    (day: number, which: "current" | "next") => {
      setSelectedDay(day);
      setSelectedMonth(which);
    },
    [],
  );

  // --- Event form handlers ---
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

  // --- Render ---
  if (loading && events.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100svh-8rem)] overflow-hidden">
      <CalendarHeader
        year={year}
        month={month}
        viewMode={viewMode}
        language={language}
        onPrevMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
        onViewModeChange={handleViewModeChange}
        translations={t}
      />

      <CalendarGrid
        year={year}
        month={month}
        viewMode={viewMode}
        language={language}
        selectedDay={selectedDay}
        selectedMonth={selectedMonth}
        eventsByDate={eventsByDate}
        holidaysByDate={holidaysByDate}
        todayKey={todayKey}
        weekdays={weekdays}
        onSelectDay={handleSelectDay}
      />

      {selectedDay && (
        <DayDetailPanel
          dayLabel={selectedDayLabel}
          holidays={selectedHolidays}
          events={selectedEvents}
          language={language}
          translations={t}
          onAddEvent={openAddDialog}
          onEditEvent={openEditDialog}
        />
      )}

      <EventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingEvent={editingEvent}
        form={form}
        saving={saving}
        deleteConfirmOpen={deleteConfirmOpen}
        onDeleteConfirmChange={setDeleteConfirmOpen}
        translations={t}
        onFormChange={setForm}
        onSave={handleSave}
        onDelete={handleDelete}
      />

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

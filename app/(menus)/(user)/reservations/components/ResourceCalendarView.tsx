"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Loader2, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { reservationTranslations } from "../translations";
import ReservationForm from "./ReservationForm";

/** JST (Asia/Tokyo) の今日の日付を YYYY-MM-DD で返す */
const getJSTDateString = (): string => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
};

interface AvailabilityReservation {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  user: { id: string; name: string | null };
}

interface Resource {
  id: string;
  name: string;
  nameEn: string | null;
  location?: string | null;
  capacity?: number | null;
  notes?: string | null;
  isActive?: boolean;
  category: {
    id?: string;
    name: string;
    nameEn: string | null;
    type?: string;
    color: string | null;
    requiresApproval: boolean;
  };
}

interface ResourceCalendarViewProps {
  language: "en" | "ja";
  resource: Resource;
  onClose: () => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 ~ 18:00

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function ResourceCalendarView({
  language,
  resource,
  onClose,
}: ResourceCalendarViewProps) {
  const t = reservationTranslations[language];
  const todayJST = getJSTDateString();

  const [date, setDate] = useState(todayJST);
  const [reservations, setReservations] = useState<AvailabilityReservation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // Mini calendar display month
  const [calYear, setCalYear] = useState(parseInt(todayJST.split("-")[0]));
  const [calMonth, setCalMonth] = useState(
    parseInt(todayJST.split("-")[1]) - 1,
  );

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formInitialStart, setFormInitialStart] = useState<
    string | undefined
  >();
  const [formInitialEnd, setFormInitialEnd] = useState<string | undefined>();

  // Drag state (refs for event handlers, state for rendering)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);
  const [dragCurrentHour, setDragCurrentHour] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartHourRef = useRef<number | null>(null);
  const dragCurrentHourRef = useRef<number | null>(null);

  const resourceName =
    language === "ja" ? resource.name : resource.nameEn || resource.name;

  const weekdays = language === "ja" ? WEEKDAYS_JA : WEEKDAYS_EN;

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calYear, calMonth]);

  const calendarMonthLabel = useMemo(() => {
    if (language === "ja") {
      return `${calYear}年${calMonth + 1}月`;
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
    return `${monthNames[calMonth]} ${calYear}`;
  }, [calYear, calMonth, language]);

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = `${date}T00:00:00`;
      const endDate = `${date}T23:59:59`;
      const params = new URLSearchParams({
        resourceId: resource.id,
        startDate,
        endDate,
      });
      const res = await fetch(
        `/api/general-affairs/availability?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations);
      }
    } catch (err) {
      console.error("Failed to fetch availability:", err);
    } finally {
      setLoading(false);
    }
  }, [resource.id, date]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Calendar navigation
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const today = getJSTDateString();
    setDate(today);
    setCalYear(parseInt(today.split("-")[0]));
    setCalMonth(parseInt(today.split("-")[1]) - 1);
  };

  const handleDateSelect = (day: number) => {
    const newDate = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setDate(newDate);
  };

  const formatDateStr = (day: number) => {
    return `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getReservationForHour = (hour: number) => {
    return reservations.filter((rv) => {
      const start = new Date(rv.startTime);
      const end = new Date(rv.endTime);
      const slotStart = new Date(
        `${date}T${hour.toString().padStart(2, "0")}:00:00`,
      );
      const slotEnd = new Date(
        `${date}T${(hour + 1).toString().padStart(2, "0")}:00:00`,
      );
      return start < slotEnd && end > slotStart;
    });
  };

  // Selected date display
  const selectedDateLabel = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (language === "ja") {
      const dow = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
      return `${m}月${d}日(${dow})`;
    }
    return dt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [date, language]);

  // Dialog helpers
  const openDialog = (start?: string, end?: string) => {
    setFormInitialStart(start);
    setFormInitialEnd(end);
    setDialogOpen(true);
  };

  const handleDialogSave = () => {
    setDialogOpen(false);
    fetchAvailability();
  };

  // Drag handlers
  const handleMouseDown = (hour: number) => {
    setIsDragging(true);
    setDragStartHour(hour);
    setDragCurrentHour(hour);
    isDraggingRef.current = true;
    dragStartHourRef.current = hour;
    dragCurrentHourRef.current = hour;
  };

  const handleMouseEnter = (hour: number) => {
    if (isDraggingRef.current) {
      setDragCurrentHour(hour);
      dragCurrentHourRef.current = hour;
    }
  };

  const finalizeDrag = useCallback(() => {
    if (
      isDraggingRef.current &&
      dragStartHourRef.current !== null &&
      dragCurrentHourRef.current !== null
    ) {
      const startH = Math.min(
        dragStartHourRef.current,
        dragCurrentHourRef.current,
      );
      const endH =
        Math.max(dragStartHourRef.current, dragCurrentHourRef.current) + 1;
      setFormInitialStart(`${startH.toString().padStart(2, "0")}:00`);
      setFormInitialEnd(`${endH.toString().padStart(2, "0")}:00`);
      setDialogOpen(true);
    }
    setIsDragging(false);
    setDragStartHour(null);
    setDragCurrentHour(null);
    isDraggingRef.current = false;
    dragStartHourRef.current = null;
    dragCurrentHourRef.current = null;
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        finalizeDrag();
      }
    };
    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [finalizeDrag]);

  const isInDragRange = (hour: number) => {
    if (!isDragging || dragStartHour === null || dragCurrentHour === null)
      return false;
    const min = Math.min(dragStartHour, dragCurrentHour);
    const max = Math.max(dragStartHour, dragCurrentHour);
    return hour >= min && hour <= max;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 border-b">
        <div className="flex items-center gap-2 shrink-0">
          {resource.category.color && (
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: resource.category.color }}
            />
          )}
          <h3 className="font-medium">{resourceName}</h3>
        </div>

        {/* Day overview bar */}
        {!loading && (
          <div className="flex-1 flex gap-px min-w-0">
            {HOURS.map((hour, i) => {
              const hourRvs = getReservationForHour(hour);
              const hasReservation = hourRvs.length > 0;
              const isPending = hourRvs.some((r) => r.status === "PENDING");
              return (
                <div
                  key={hour}
                  className={cn(
                    "h-6 flex-1 flex items-center justify-center transition-colors",
                    i === 0 && "rounded-l-sm",
                    i === HOURS.length - 1 && "rounded-r-sm",
                    hasReservation
                      ? isPending
                        ? "bg-amber-400/60"
                        : "bg-red-400/60"
                      : "bg-green-400/20",
                  )}
                  title={`${hour}:00 – ${hour + 1}:00: ${
                    hasReservation
                      ? hourRvs.map((r) => r.title).join(", ")
                      : t.available
                  }`}
                >
                  <span className={cn(
                    "text-[9px] leading-none",
                    hasReservation ? "text-foreground/70" : "text-muted-foreground/60",
                  )}>
                    {hour}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-1" />
            {t.makeReservation}
          </Button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mini Calendar */}
      <div className="p-3 border-b">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{calendarMonthLabel}</span>
            <button
              onClick={goToday}
              className="px-2 py-0.5 text-xs rounded border hover:bg-muted"
            >
              {t.today}
            </button>
          </div>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map((day, i) => (
            <div
              key={day}
              className={cn(
                "text-center text-xs font-medium py-0.5",
                i === 0 && "text-red-500",
                i === 6 && "text-blue-500",
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-7" />;
            }

            const dateStr = formatDateStr(day);
            const isToday = dateStr === todayJST;
            const isSelected = dateStr === date;
            const dayOfWeek = new Date(calYear, calMonth, day).getDay();

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateSelect(day)}
                className={cn(
                  "h-7 w-full rounded text-xs transition-colors hover:bg-accent",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isSelected && isToday && "ring-1 ring-primary",
                  !isSelected && dayOfWeek === 0 && "text-red-500",
                  !isSelected && dayOfWeek === 6 && "text-blue-500",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date label */}
      <div className="px-3 py-1.5 border-b bg-muted/30 text-center">
        <span className="text-sm font-medium">{selectedDateLabel}</span>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={`divide-y ${isDragging ? "select-none" : ""}`}>
          {HOURS.map((hour) => {
            const hourReservations = getReservationForHour(hour);
            const hasReservation = hourReservations.length > 0;
            const inDragRange = isInDragRange(hour);

            return (
              <div
                key={hour}
                className={`flex items-stretch min-h-[40px] transition-colors ${
                  inDragRange
                    ? "bg-primary/15"
                    : hasReservation
                      ? "bg-red-50/50"
                      : "hover:bg-green-50/50 cursor-row-resize"
                }`}
                onMouseDown={(e) => {
                  if (!hasReservation && e.button === 0) {
                    e.preventDefault();
                    handleMouseDown(hour);
                  }
                }}
                onMouseEnter={() => handleMouseEnter(hour)}
              >
                <div className="w-16 flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground border-r">
                  {hour}:00
                </div>
                <div className="flex-1 px-3 py-1 flex items-center">
                  {hasReservation ? (
                    <div className="space-y-0.5">
                      {hourReservations.map((rv) => (
                        <div
                          key={rv.id}
                          className="text-xs flex items-center gap-2"
                        >
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              rv.status === "CONFIRMED"
                                ? "bg-green-500"
                                : "bg-amber-500"
                            }`}
                          />
                          <span className="font-medium">{rv.title}</span>
                          <span className="text-muted-foreground">
                            ({rv.user.name})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={`text-xs ${inDragRange ? "text-primary font-medium" : "text-green-600/60"}`}
                    >
                      {inDragRange
                        ? `${Math.min(dragStartHour!, dragCurrentHour!)}:00 — ${Math.max(dragStartHour!, dragCurrentHour!) + 1}:00`
                        : t.available}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reservation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.makeReservation}</DialogTitle>
            <DialogDescription>{resourceName}</DialogDescription>
          </DialogHeader>
          <ReservationForm
            language={language}
            resourceId={resource.id}
            resourceName={resourceName}
            initialDate={date}
            initialStart={formInitialStart}
            initialEnd={formInitialEnd}
            onSave={handleDialogSave}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

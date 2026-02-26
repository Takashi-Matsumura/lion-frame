"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "../translations";
import { type CalendarEvent, type Translations, CATEGORY_COLORS, formatTime } from "./calendar-types";

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 60;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const LABEL_WIDTH = 50;
const SNAP_MINUTES = 15;

interface TimelineViewProps {
  date: string;
  events: CalendarEvent[];
  language: Language;
  translations: Translations;
  isToday: boolean;
  isPastDate: boolean;
  onAddEventWithTime: (startTime: string, endTime: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
}

function yToTime(y: number): { hour: number; minute: number } {
  const totalMinutes = (y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
  const snapped = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  const clamped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snapped));
  return { hour: Math.floor(clamped / 60), minute: clamped % 60 };
}

function timeToY(hour: number, minute: number): number {
  return ((hour - START_HOUR) * 60 + minute) * (HOUR_HEIGHT / 60);
}

function toISO(date: string, hour: number, minute: number): string {
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${date}T${h}:${m}:00`;
}

export function TimelineView({
  date,
  events,
  language,
  translations: t,
  isToday,
  isPastDate,
  onAddEventWithTime,
  onEditEvent,
}: TimelineViewProps) {
  const canDrag = !isPastDate;
  const containerRef = useRef<HTMLDivElement>(null);
  const [nowY, setNowY] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const isDragging = useRef(false);

  // Current time indicator
  useEffect(() => {
    if (!isToday) {
      setNowY(null);
      return;
    }
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (h >= START_HOUR && h < END_HOUR) {
        setNowY(timeToY(h, m));
      } else {
        setNowY(null);
      }
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  // Scroll to current time or 9:00 on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const scrollTarget = isToday && nowY !== null ? nowY - 120 : timeToY(9, 0) - 20;
    containerRef.current.scrollTop = Math.max(0, scrollTarget);
  }, [isToday, nowY]);

  // Separate all-day and timed events
  const allDayEvents = events.filter((ev) => ev.allDay);
  const timedEvents = events.filter((ev) => !ev.allDay);

  // Calculate event positions
  const eventBlocks = timedEvents.map((ev) => {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);
    const startH = start.getHours();
    const startM = start.getMinutes();
    const endH = end.getHours();
    const endM = end.getMinutes();

    const top = timeToY(
      Math.max(startH, START_HOUR),
      startH < START_HOUR ? 0 : startM,
    );
    const bottom = timeToY(
      Math.min(endH, END_HOUR),
      endH >= END_HOUR ? 0 : endM,
    );
    const height = Math.max(bottom - top, 20);

    return { event: ev, top, height };
  });

  // Drag handlers
  const getRelativeY = useCallback((clientY: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return clientY - rect.top + containerRef.current.scrollTop;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canDrag) return;
      // Only on the grid area, not on event blocks
      if ((e.target as HTMLElement).closest("[data-event-block]")) return;
      const y = getRelativeY(e.clientY) - (allDayEvents.length > 0 ? 28 : 0);
      if (y < 0) return;
      isDragging.current = true;
      setDragStart(y);
      setDragEnd(y);
    },
    [getRelativeY, allDayEvents.length, canDrag],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const y = getRelativeY(e.clientY) - (allDayEvents.length > 0 ? 28 : 0);
      setDragEnd(y);
    },
    [getRelativeY, allDayEvents.length],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current || dragStart === null || dragEnd === null) {
      isDragging.current = false;
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    isDragging.current = false;

    const minY = Math.min(dragStart, dragEnd);
    const maxY = Math.max(dragStart, dragEnd);

    // Require minimum drag distance (15px ~ 15min)
    if (maxY - minY < 15) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const startTime = yToTime(minY);
    const endTime = yToTime(maxY);

    // Reject if start time is in the past (today only)
    if (isToday) {
      const now = new Date();
      const startDate = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(),
        startTime.hour, startTime.minute,
      );
      if (startDate < now) {
        setDragStart(null);
        setDragEnd(null);
        return;
      }
    }

    setDragStart(null);
    setDragEnd(null);

    onAddEventWithTime(
      toISO(date, startTime.hour, startTime.minute),
      toISO(date, endTime.hour, endTime.minute),
    );
  }, [dragStart, dragEnd, date, isToday, onAddEventWithTime]);

  // Drag selection rect with time labels
  const selectionRect =
    dragStart !== null && dragEnd !== null
      ? (() => {
          const minY = Math.min(dragStart, dragEnd);
          const maxY = Math.max(dragStart, dragEnd);
          const startT = yToTime(minY);
          const endT = yToTime(maxY);
          const fmt = (t: { hour: number; minute: number }) =>
            `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
          return {
            top: minY,
            height: Math.abs(dragEnd - dragStart),
            startLabel: fmt(startT),
            endLabel: fmt(endT),
          };
        })()
      : null;

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  const totalHeight = TOTAL_HOURS * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Drag hint */}
      {canDrag && (
        <div className="text-xs text-muted-foreground px-2 py-1 shrink-0">
          {t.dragToCreate}
        </div>
      )}

      {/* Scrollable timeline */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* All-day events bar */}
        {allDayEvents.length > 0 && (
          <div className="flex items-center gap-1 px-1 py-1 border-b bg-muted/30 sticky top-0 z-10">
            <span className="text-xs text-muted-foreground w-[50px] shrink-0 text-right pr-2">
              {t.timelineAllDay}
            </span>
            <div className="flex gap-1 flex-wrap">
              {allDayEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  data-event-block
                  className={`text-xs px-2 py-0.5 rounded truncate max-w-[150px] cursor-pointer hover:opacity-80 ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.other} text-foreground`}
                  onClick={() => onEditEvent(ev)}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className="relative" style={{ height: totalHeight }}>
          {/* Hour lines and labels */}
          {hours.map((hour) => {
            const y = (hour - START_HOUR) * HOUR_HEIGHT;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top: y }}>
                <div className="flex items-start">
                  <span className="text-xs text-muted-foreground w-[50px] shrink-0 text-right pr-2 -mt-2">
                    {`${hour}:00`}
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>
              </div>
            );
          })}

          {/* Half-hour lines */}
          {hours.map((hour) => {
            const y = (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2;
            return (
              <div
                key={`${hour}-half`}
                className="absolute right-0 border-t border-dashed border-border/50"
                style={{ top: y, left: LABEL_WIDTH }}
              />
            );
          })}

          {/* Event blocks */}
          {eventBlocks.map(({ event, top, height }) => (
            <button
              key={event.id}
              type="button"
              data-event-block
              className={`absolute rounded px-1.5 py-0.5 text-xs overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-foreground/10 ${CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.other} text-foreground`}
              style={{
                top,
                left: LABEL_WIDTH + 4,
                right: 4,
                height,
              }}
              onClick={() => onEditEvent(event)}
            >
              <div className="font-medium truncate">{event.title}</div>
              {height > 30 && (
                <div className="text-[10px] opacity-70">
                  {formatTime(event.startTime)}-{formatTime(event.endTime)}
                </div>
              )}
            </button>
          ))}

          {/* Drag selection */}
          {selectionRect && (
            <div
              className="absolute bg-primary/20 border border-primary/40 rounded pointer-events-none"
              style={{
                top: selectionRect.top,
                left: LABEL_WIDTH + 4,
                right: 4,
                height: selectionRect.height,
              }}
            >
              <span className="absolute -top-5 left-0 text-xs font-mono text-primary font-semibold">
                {selectionRect.startLabel}
              </span>
              <span className="absolute -bottom-5 left-0 text-xs font-mono text-primary font-semibold">
                {selectionRect.endLabel}
              </span>
            </div>
          )}

          {/* Current time indicator */}
          {nowY !== null && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: nowY }}
            >
              <div className="flex items-center">
                <div className="w-[50px] flex justify-end pr-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 border-t-2 border-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

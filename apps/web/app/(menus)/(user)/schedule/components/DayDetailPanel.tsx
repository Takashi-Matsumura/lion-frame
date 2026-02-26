import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Language } from "../translations";
import {
  type CalendarEvent,
  type Holiday,
  type Translations,
  CATEGORY_COLORS,
  formatTime,
} from "./calendar-types";

interface DayDetailPanelProps {
  dayLabel: string;
  holidays: Holiday[];
  events: CalendarEvent[];
  language: Language;
  translations: Translations;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
}

export function DayDetailPanel({
  dayLabel,
  holidays,
  events,
  language,
  translations: t,
  onAddEvent,
  onEditEvent,
}: DayDetailPanelProps) {
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

  return (
    <div className="border rounded-lg p-4 flex-1 min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{dayLabel}</h3>
        <Button size="sm" onClick={onAddEvent}>
          + {t.addEvent}
        </Button>
      </div>

      {holidays.length === 0 && events.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.noEvents}</p>
      )}

      <div className="space-y-2">
        {/* Holidays */}
        {holidays.map((h) => (
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
        {events.map((ev) => (
          <button
            type="button"
            key={ev.id}
            className="w-full flex items-center gap-2 text-sm py-2 px-3 rounded hover:bg-accent transition-colors cursor-pointer text-left"
            onClick={() => onEditEvent(ev)}
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
  );
}

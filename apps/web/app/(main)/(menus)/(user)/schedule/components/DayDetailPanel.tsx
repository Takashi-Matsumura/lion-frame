import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Language } from "../translations";
import {
  type CalendarEvent,
  type CompanyEvent,
  type Holiday,
  type Translations,
  CATEGORY_COLORS,
  COMPANY_EVENT_COLORS,
  formatTime,
} from "./calendar-types";
import { TimelineView } from "./TimelineView";

interface DayDetailPanelProps {
  dayLabel: string;
  holidays: Holiday[];
  companyEvents: CompanyEvent[];
  events: CalendarEvent[];
  language: Language;
  translations: Translations;
  selectedDateKey: string;
  todayKey: string;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onAddEventWithTime: (startTime: string, endTime: string) => void;
}

export function DayDetailPanel({
  dayLabel,
  holidays,
  companyEvents,
  events,
  language,
  translations: t,
  selectedDateKey,
  todayKey,
  onAddEvent,
  onEditEvent,
  onAddEventWithTime,
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

  const companyCategoryLabel = useCallback(
    (cat: string) => {
      const map: Record<string, string> = {
        event: t.companyCategoryEvent,
        deadline: t.companyCategoryDeadline,
        period: t.companyCategoryPeriod,
      };
      return map[cat] ?? cat;
    },
    [t],
  );

  const isPastDate = selectedDateKey < todayKey;

  return (
    <div className="border rounded-lg flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header - full width */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h3 className="font-semibold">{dayLabel}</h3>
        {!isPastDate && (
          <Button size="sm" onClick={onAddEvent}>
            + {t.addEvent}
          </Button>
        )}
      </div>

      {/* Content - left/right split */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Holiday/Event list */}
        <div className="flex-1 min-w-0 overflow-y-auto border-r p-3">
          {holidays.length === 0 && companyEvents.length === 0 && events.length === 0 && (
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

            {/* Company Events (read-only) */}
            {companyEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-2 text-sm py-2 px-3 rounded bg-teal-50 dark:bg-teal-950/20"
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COMPANY_EVENT_COLORS[ev.category] ?? "bg-teal-400"}`} />
                <span className="text-teal-700 dark:text-teal-400 font-medium truncate">
                  {language === "ja" ? ev.title : (ev.titleEn ?? ev.title)}
                </span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  ({companyCategoryLabel(ev.category)})
                </span>
                {ev.departmentName && (
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    [{ev.departmentName}]
                  </span>
                )}
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

        {/* Right: Timeline view */}
        <div className="flex-1 min-w-0">
          <TimelineView
            date={selectedDateKey}
            events={events}
            language={language}
            translations={t}
            isToday={selectedDateKey === todayKey}
            isPastDate={isPastDate}
            onAddEventWithTime={onAddEventWithTime}
            onEditEvent={onEditEvent}
          />
        </div>
      </div>
    </div>
  );
}

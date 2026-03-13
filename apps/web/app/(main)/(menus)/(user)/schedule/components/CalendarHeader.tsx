import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import type { Language } from "../translations";
import type { Translations } from "./calendar-types";

interface CalendarHeaderProps {
  year: number;
  month: number;
  viewMode: "single" | "dual";
  language: Language;
  calendarOpen: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onViewModeChange: (mode: "single" | "dual") => void;
  onToggleCalendar: () => void;
  translations: Translations;
}

export function CalendarHeader({
  year,
  month,
  viewMode,
  language,
  calendarOpen,
  onPrevMonth,
  onNextMonth,
  onToday,
  onViewModeChange,
  onToggleCalendar,
  translations: t,
}: CalendarHeaderProps) {
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonthNum = month === 11 ? 0 : month + 1;

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
        <span className="text-sm font-normal text-muted-foreground">
          {sub}
        </span>
      </>
    );
  }, [year, month, nextYear, nextMonthNum, language, viewMode]);

  return (
    <div className="flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevMonth}
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
          onClick={onNextMonth}
          aria-label={t.nextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
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
            onClick={() => onViewModeChange("single")}
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
            onClick={() => onViewModeChange("dual")}
          >
            2
          </button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCalendar}
        aria-label={calendarOpen ? t.collapseCalendar : t.expandCalendar}
        title={calendarOpen ? t.collapseCalendar : t.expandCalendar}
      >
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

import { handsonTranslations } from "../translations";
import type { Language, AnalyticsData } from "../types";

interface Props {
  language: Language;
  timeline: AnalyticsData["instructorTimeline"];
}

export default function InstructorTimeline({ language, timeline }: Props) {
  const t = handsonTranslations[language].analytics;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t.instructorTimeline}</h3>
      {timeline.length === 0 ? (
        <div className="rounded-lg border bg-card py-6 text-center text-sm text-muted-foreground">
          {t.noTimeline}
        </div>
      ) : (
        <div className="relative border-l-2 border-blue-300 pl-6 dark:border-blue-800">
          {timeline.map((item, i) => (
            <div key={i} className="relative mb-4">
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-blue-500" />
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-foreground">
                  #{item.commandIndex + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.timestamp).toLocaleTimeString(language === "ja" ? "ja-JP" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

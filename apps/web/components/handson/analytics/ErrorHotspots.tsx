import { handsonTranslations } from "../translations";
import type { Language, AnalyticsData } from "../types";

interface Props {
  language: Language;
  errorHotspots: AnalyticsData["errorHotspots"];
}

export default function ErrorHotspots({ language, errorHotspots }: Props) {
  const t = handsonTranslations[language].analytics;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t.errorHotspots}</h3>
      {errorHotspots.length === 0 ? (
        <div className="rounded-lg border bg-card py-6 text-center text-sm text-muted-foreground">
          {t.noErrors}
        </div>
      ) : (
        <div className="space-y-2">
          {errorHotspots.map((h) => {
            const total = h.errorCount + h.okCount;
            const rate = total > 0 ? Math.round((h.errorCount / total) * 100) : 0;
            return (
              <div key={h.commandIndex} className="flex items-center gap-3">
                <span className="w-12 text-right font-mono text-xs text-muted-foreground">
                  #{h.commandIndex + 1}
                </span>
                <div className="h-5 flex-1 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full rounded bg-red-500"
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <span className="w-16 text-xs text-muted-foreground">
                  {h.errorCount}{t.errorCount} / {total}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

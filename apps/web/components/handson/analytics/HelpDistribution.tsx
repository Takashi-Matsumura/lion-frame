import { handsonTranslations } from "../translations";
import type { Language, AnalyticsData } from "../types";

interface Props {
  language: Language;
  helpBySection: AnalyticsData["helpBySection"];
}

export default function HelpDistribution({ language, helpBySection }: Props) {
  const tc = handsonTranslations[language].common;
  const t = handsonTranslations[language].analytics;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t.helpBySection}</h3>
      {helpBySection.length === 0 ? (
        <div className="rounded-lg border bg-card py-6 text-center text-sm text-muted-foreground">
          {t.noHelp}
        </div>
      ) : (
        <div className="space-y-2">
          {helpBySection.map((h) => {
            const maxCount = Math.max(...helpBySection.map((x) => x.count));
            const rate = maxCount > 0 ? Math.round((h.count / maxCount) * 100) : 0;
            return (
              <div key={h.sectionIndex} className="flex items-center gap-3">
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {tc.section} {h.sectionIndex + 1}
                </span>
                <div className="h-5 flex-1 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full rounded bg-amber-500"
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <span className="w-10 text-xs text-muted-foreground">
                  {h.count}{t.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

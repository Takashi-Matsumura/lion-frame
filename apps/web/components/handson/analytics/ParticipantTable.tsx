import { handsonTranslations } from "../translations";
import type { Language, AnalyticsData } from "../types";

interface Props {
  language: Language;
  participants: AnalyticsData["participants"];
  totalCommands: number;
}

export default function ParticipantTable({ language, participants, totalCommands }: Props) {
  const tc = handsonTranslations[language].common;
  const t = handsonTranslations[language].analytics;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{t.participantTable}</h3>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{tc.seat}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.name}</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">{tc.ok}</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t.errors}</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">{t.help}</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t.completion}</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => {
              const rate = totalCommands > 0
                ? Math.round((p.commandsOk / totalCommands) * 100)
                : 0;
              return (
                <tr key={p.seatNumber} className="border-b">
                  <td className="px-3 py-2 font-semibold text-foreground">{p.seatNumber}</td>
                  <td className="px-3 py-2 text-foreground">{p.displayName}</td>
                  <td className="px-3 py-2 text-center text-green-600 dark:text-green-400">{p.commandsOk}</td>
                  <td className="px-3 py-2 text-center text-red-600 dark:text-red-400">{p.commandsError || "-"}</td>
                  <td className="px-3 py-2 text-center text-amber-600 dark:text-amber-400">{p.helpRequests || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

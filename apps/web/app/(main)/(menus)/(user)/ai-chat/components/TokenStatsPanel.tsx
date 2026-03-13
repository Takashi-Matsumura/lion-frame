"use client";

import { formatTokenCount } from "@/lib/core-modules/ai";
import type { TokenStats } from "@/types/ai-chat";
import { aiChatTranslations } from "../translations";

interface TokenStatsPanelProps {
  tokenStats: TokenStats;
  showStats: boolean;
  isLoading: boolean;
  language: "en" | "ja";
}

export function TokenStatsPanel({
  tokenStats,
  showStats,
  isLoading,
  language,
}: TokenStatsPanelProps) {
  const t = aiChatTranslations[language];

  const hasActivity =
    tokenStats.inputTokens > 0 || tokenStats.outputTokens > 0 || isLoading;

  if (!showStats || !hasActivity) {
    return null;
  }

  const contextUsagePercent = Math.min(
    ((tokenStats.inputTokens + tokenStats.outputTokens) /
      tokenStats.contextWindow) *
      100,
    100,
  );

  return (
    <div className="flex-shrink-0 px-4 py-2 border-t bg-muted/30">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {/* Context Usage Bar */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <span className="text-muted-foreground whitespace-nowrap">
            {t.stats.contextUsage}
          </span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                contextUsagePercent > 90
                  ? "bg-destructive"
                  : contextUsagePercent > 70
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
              style={{ width: `${Math.max(contextUsagePercent, 1)}%` }}
            />
          </div>
          <span className="font-mono text-muted-foreground whitespace-nowrap">
            {formatTokenCount(
              tokenStats.inputTokens + tokenStats.outputTokens,
            )}
            /{formatTokenCount(tokenStats.contextWindow)}
          </span>
        </div>

        {/* Token Counts */}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {t.stats.inputTokens}:{" "}
            <span className="font-mono font-medium text-foreground">
              {formatTokenCount(tokenStats.inputTokens)}
            </span>
          </span>
          <span className="text-muted-foreground">
            {t.stats.outputTokens}:{" "}
            <span className="font-mono font-medium text-foreground">
              {formatTokenCount(tokenStats.outputTokens)}
            </span>
          </span>
        </div>

        {/* Tokens per second */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">
            {t.stats.tokensPerSecond}:
          </span>
          <span
            className={`font-mono font-medium ${isLoading ? "text-primary animate-pulse" : "text-foreground"}`}
          >
            {tokenStats.tokensPerSecond > 0
              ? `${tokenStats.tokensPerSecond} ${t.stats.tpsUnit}`
              : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

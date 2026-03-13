"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Lightbulb, Search, Zap } from "lucide-react";
import type { RagRetrievalData } from "@/types/ai-chat";
import type { AIChatTranslations } from "../translations";

interface RagInsightPanelProps {
  data: RagRetrievalData;
  t: AIChatTranslations;
}

function ScoreBar({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  const barColor =
    percent >= 70
      ? "bg-green-500"
      : percent >= 40
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums w-12 text-right">
        {percent.toFixed(1)}%
      </span>
    </div>
  );
}

export function RagInsightPanel({ data, t }: RagInsightPanelProps) {
  const [open, setOpen] = useState(false);
  const ri = t.ragInsight;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        {open ? ri.toggleClose : ri.toggle}
      </button>

      {open && (
        <div className="mt-2 border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/30 text-sm space-y-4">
          {/* Step 1: Query */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-xs">
                1
              </span>
              <Search className="w-3.5 h-3.5" />
              {ri.stepQuery}
            </div>
            <div className="ml-7 flex items-center gap-2">
              <code className="px-2 py-1 bg-white dark:bg-gray-900 rounded text-xs border">
                {data.query}
              </code>
              <span className="text-xs text-muted-foreground">
                ({data.searchTimeMs}{ri.searchTime})
              </span>
            </div>
          </div>

          {/* Step 2: Vector Search Results */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-xs">
                2
              </span>
              <Zap className="w-3.5 h-3.5" />
              {ri.stepResults}
              <span className="text-xs font-normal text-muted-foreground">
                ({data.retrievedCount}{ri.hits})
              </span>
            </div>
            <div className="ml-7 space-y-3">
              {data.items.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📄</span>
                    <span className="text-xs font-medium">
                      {item.filename}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({ri.chunk} {item.chunkIndex + 1}/{item.totalChunks})
                    </span>
                  </div>
                  <div className="ml-5">
                    <ScoreBar score={item.score} />
                  </div>
                  <p className="ml-5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    &ldquo;{item.content}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Context Injection */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-xs">
                3
              </span>
              {ri.stepContext}
            </div>
            <div className="ml-7 text-xs text-muted-foreground space-y-0.5">
              <p>→ {ri.contextExplain}</p>
              <p>→ {ri.contextExplain2}</p>
            </div>
          </div>

          {/* Learning Tip */}
          <div className="flex items-start gap-2 ml-7 p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-400">
            <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {ri.tip}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { GenerationMetrics } from '../../types';

interface MetricsDisplayProps {
  metrics: GenerationMetrics;
}

export function MetricsDisplay({ metrics }: MetricsDisplayProps) {
  const formatNumber = (num: number, decimals: number = 0) => {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {/* コンテキストウィンドウ使用量 */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Context:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                metrics.contextUsagePercent > 80
                  ? 'bg-red-500'
                  : metrics.contextUsagePercent > 50
                  ? 'bg-yellow-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${Math.min(metrics.contextUsagePercent, 100)}%` }}
            />
          </div>
          <span className="tabular-nums">
            {formatNumber(metrics.inputTokens + metrics.outputTokens)} / {formatNumber(metrics.contextWindowSize)}
          </span>
          <span className="text-zinc-400">({metrics.contextUsagePercent.toFixed(1)}%)</span>
        </div>
      </div>

      {/* 区切り線 */}
      <div className="w-px h-3 bg-border" />

      {/* 入力/出力トークン */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">In:</span>
        <span className="tabular-nums">{formatNumber(metrics.inputTokens)}</span>
        <span className="text-muted-foreground ml-1">Out:</span>
        <span className="tabular-nums">{formatNumber(metrics.outputTokens)}</span>
      </div>

      {/* 区切り線 */}
      <div className="w-px h-3 bg-border" />

      {/* 生成速度 */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Speed:</span>
        <span className={`tabular-nums ${metrics.isGenerating ? 'text-green-600 dark:text-green-400' : ''}`}>
          {formatNumber(metrics.tokensPerSecond, 1)} tok/s
        </span>
        {metrics.isGenerating && (
          <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* 区切り線 */}
      <div className="w-px h-3 bg-border" />

      {/* 生成時間 */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Time:</span>
        <span className="tabular-nums">{formatTime(metrics.totalTimeMs)}</span>
      </div>
    </div>
  );
}

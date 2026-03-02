import { Skeleton } from "@/components/ui/skeleton";

/**
 * ScheduleClient のスケルトン
 * ナビゲーションバー + 曜日ヘッダー + カレンダーグリッド(5週) + 日付詳細パネル
 */
export function ScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-4 h-[calc(100svh-8rem)] overflow-hidden">
      {/* Calendar Header: ← 2026年 3月 / 4月 → 今日 [1] [2] ↕ */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-8 w-12 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="border rounded-lg h-full flex flex-col">
          {/* Weekday header: 日 月 火 水 木 金 土 */}
          <div className="grid grid-cols-7 border-b">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="py-2 flex justify-center">
                <Skeleton className="h-4 w-6" />
              </div>
            ))}
          </div>

          {/* 5 week rows */}
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="grid grid-cols-7 flex-1 border-b last:border-b-0">
              {Array.from({ length: 7 }).map((_, col) => (
                <div key={col} className="border-r last:border-r-0 p-1.5 space-y-1">
                  <Skeleton className="h-4 w-5" />
                  {/* Some cells have event dots */}
                  {(row + col) % 3 === 0 && (
                    <div className="flex gap-0.5">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-2 w-2 rounded-full" />
                    </div>
                  )}
                  {(row + col) % 4 === 1 && (
                    <div className="flex gap-0.5">
                      <Skeleton className="h-2 w-2 rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Day Detail Panel */}
      <div className="flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

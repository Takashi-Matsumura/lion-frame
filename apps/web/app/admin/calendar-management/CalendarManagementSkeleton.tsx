import { Skeleton } from "@/components/ui/skeleton";

/**
 * CalendarSettingsTab のスケルトン
 * カレンダー設定パネル + イベントカテゴリパネル
 */
export function CalendarSettingsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 h-full overflow-y-auto space-y-4">
      {/* カレンダー設定パネル */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-5 w-5" />
        </div>
        <div className="p-6 space-y-6">
          {/* 週の開始曜日 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-[200px] rounded-md" />
          </div>
          {/* デフォルト表示 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-[200px] rounded-md" />
          </div>
          {/* 営業時間 */}
          <div className="flex gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-[160px] rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-[160px] rounded-md" />
            </div>
          </div>
          {/* 保存ボタン */}
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </div>

      {/* イベントカテゴリパネル */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-5 w-5" />
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-end">
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
          {/* テーブルヘッダー + 3行 */}
          <div className="border rounded-lg">
            <div className="flex items-center gap-4 p-3 border-b bg-muted/50">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border-b last:border-b-0">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CompanyEventsTab のスケルトン
 * ツールバー + テーブル
 */
export function CompanyEventsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <Skeleton className="h-9 w-[180px] rounded-md" />
        <Skeleton className="h-9 w-[120px] rounded-md" />
        <Skeleton className="h-4 w-16" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      {/* Table */}
      <div className="border rounded-lg flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center gap-4 p-3 border-b bg-muted/50">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 border-b last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * HolidayManagement のスケルトン
 * ツールバー + テーブル
 */
export function HolidayManagementSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <Skeleton className="h-9 w-[120px] rounded-md" />
        <Skeleton className="h-9 w-[120px] rounded-md" />
        <Skeleton className="h-4 w-16" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      {/* Table */}
      <div className="border rounded-lg flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-4 p-3 border-b bg-muted/50">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 border-b last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

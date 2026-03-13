import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * AuditLogsClient のスケルトン（dynamic() fallback用）
 * フィルターバー + テーブル
 */
export function AuditLogsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 h-full flex flex-col">
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          {/* フィルターバー + 診断ボタン */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-[180px] rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-9 w-[180px] rounded-md" />
            </div>
            <div className="ml-auto">
              <Skeleton className="h-8 w-36 rounded-md" />
            </div>
          </div>

          {/* テーブルスケルトン */}
          <AuditLogsTableSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * テーブル部分のみのスケルトン（ローディング中の差し替え用）
 */
export function AuditLogsTableSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ページネーション */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      {/* テーブル */}
      <div className="rounded-lg border overflow-hidden flex-1 flex flex-col min-h-0">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 p-3 border-b bg-muted/50">
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-4 w-[160px]" />
          <Skeleton className="h-4 flex-1" />
        </div>
        {/* 行 */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 border-b last:border-b-0">
            <Skeleton className="h-4 w-[140px]" />
            <Skeleton className="h-5 w-[100px] rounded-full" />
            <Skeleton className="h-5 w-[120px] rounded-full" />
            <div className="w-[160px] space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

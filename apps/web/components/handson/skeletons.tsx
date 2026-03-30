import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * SessionManager のスケルトン
 * ヘッダー（タイトル + ボタン）+ テーブル3行
 */
export function SessionManagerSkeleton() {
  return (
    <div>
      {/* テーブル */}
      <div className="rounded-lg border overflow-hidden">
        {/* ヘッダー行 */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/50 border-b">
          {[64, 120, 80, 56, 48, 80].map((w, i) => (
            <Skeleton key={i} className="h-4" style={{ width: w }} />
          ))}
        </div>
        {/* データ行 */}
        {Array.from({ length: 3 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ProgressMatrix のスケルトン
 * 凡例バー + グリッドセル
 */
export function ProgressMatrixSkeleton() {
  return (
    <div className="space-y-4">
      {/* 凡例 */}
      <div className="flex items-center gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      {/* マトリクス */}
      <div className="rounded-lg border">
        {/* ヘッダー */}
        <div className="flex items-center gap-0.5 px-3 py-2 border-b-2 border-border bg-muted">
          <Skeleton className="h-4 w-[100px] shrink-0" />
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-[36px] shrink-0" />
          ))}
        </div>
        {/* 講師行 */}
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b bg-blue-50 dark:bg-blue-950/30">
          <Skeleton className="h-4 w-[100px] shrink-0" />
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-4 mx-[10px] shrink-0 rounded" />
          ))}
        </div>
        {/* 参加者行 */}
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} className="flex items-center gap-0.5 px-3 py-2 border-b last:border-b-0">
            <div className="flex items-center gap-2 w-[100px] shrink-0">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-3 w-12" />
            </div>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-4 mx-[10px] shrink-0 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SessionAnalytics のスケルトン
 * モード切替 + KPIカード5枚 + テーブル + 2カラムチャート
 */
export function SessionAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* モード切替 */}
      <Skeleton className="h-9 w-36 rounded-lg" />
      {/* KPIカード */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-lg" />
        ))}
      </div>
      {/* テーブル */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="rounded-lg border overflow-hidden">
          <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 border-b">
            {[40, 80, 40, 40, 40, 120].map((w, i) => (
              <Skeleton key={i} className="h-4" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4 px-3 py-2.5 border-b last:border-b-0">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-2 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      {/* 2カラム */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 flex-1 rounded" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 flex-1 rounded" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * TraineeView の教材コンテンツスケルトン
 * 座席バッジ + 見出し・段落・コードブロックの繰り返し
 */
export function TraineeContentSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* 座席バッジ */}
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-4 w-14" />
      </div>
      {/* コンテンツ */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, section) => (
          <div key={section} className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            {/* コードブロック */}
            <Skeleton className="h-24 w-full rounded-lg" />
            {/* OK/Errorボタン */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * InstructorView 全体のスケルトン
 * SessionManagerカード + 詳細タブカード
 */
export function InstructorViewSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* セッション管理カード */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
            <SessionManagerSkeleton />
          </div>
        </CardContent>
      </Card>
      {/* 詳細タブカード */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ProgressMatrixSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}

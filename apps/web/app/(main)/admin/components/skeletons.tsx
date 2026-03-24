import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * SystemTab のスケルトン
 * Card > CardContent(p-8) 内にシステム情報6行 + アコーディオン見出し3つ
 */
export function SystemTabSkeleton() {
  return (
    <Card>
      <CardContent className="p-8">
        {/* システム情報 見出し */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="p-6 bg-muted rounded-lg">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-2 ${i < 5 ? "border-b border-border" : ""}`}
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* アコーディオン見出し3つ（閉じた状態） */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mt-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * UsersTab のスケルトン
 * Card(flex-1 flex flex-col min-h-0) 内に検索バー+フィルタ + テーブル5行
 */
export function UsersTabSkeleton() {
  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-6 flex-1 flex flex-col min-h-0">
        {/* ツールバー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-9 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[150px]" />
            <Skeleton className="h-9 w-[160px]" />
          </div>
        </div>

        {/* テーブル */}
        <div className="rounded-lg border overflow-hidden flex-1 flex flex-col min-h-0">
          {/* ヘッダー行 */}
          <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
            {[80, 120, 80, 60, 100, 60].map((w, i) => (
              <Skeleton key={i} className="h-4" style={{ width: w }} />
            ))}
          </div>
          {/* データ行 */}
          {Array.from({ length: 5 }).map((_, row) => (
            <div
              key={row}
              className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0"
            >
              <div className="flex items-center gap-3" style={{ width: 80 }}>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * AnnouncementsTab のスケルトン
 * Card(flex-1 flex flex-col min-h-0) 内にヘッダー + テンプレートgrid + カード3枚
 */
export function AnnouncementsTabSkeleton() {
  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-6 flex-1 flex flex-col min-h-0">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        {/* テンプレートパネル */}
        <div className="mb-6">
          <Skeleton className="h-4 w-36 mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>

        {/* アナウンスカード3枚 */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ModulesTab のスケルトン
 * Card(h-full flex flex-col) 内にカードgrid(1/2/3cols) × 6枚
 */
/**
 * ModulesTab のスケルトン内部コンテンツ（Card外側なし）
 * ModulesTab 内部でのローディング表示に使用
 */
export function ModulesTabSkeletonContent() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              {/* トグル + バッジ */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              {/* アイコン + テキスト */}
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-28 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <div className="flex items-center gap-4 mt-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * ModulesTab のスケルトン（dynamic import 用、外側Card付き）
 */
export function ModulesTabSkeleton() {
  return (
    <Card className="h-full flex flex-col">
      <ModulesTabSkeletonContent />
    </Card>
  );
}

/**
 * TagsTab のスケルトン
 */
export function TagsTabSkeleton() {
  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-6 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-4 w-96 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border rounded-lg">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * AccessKeyManager のスケルトン
 * Card(flex-1 flex flex-col min-h-0) 内に CardHeader + テーブル3行
 */
export function AccessKeyManagerSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-16" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* 合計 */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-16" />
          </div>
          {/* テーブル */}
          <div className="rounded-lg border overflow-hidden flex-1 flex flex-col min-h-0">
            {/* ヘッダー行 */}
            <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b">
              {[140, 80, 80, 80, 60].map((w, i) => (
                <Skeleton key={i} className="h-4" style={{ width: w }} />
              ))}
            </div>
            {/* データ行 */}
            {Array.from({ length: 3 }).map((_, row) => (
              <div
                key={row}
                className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0"
              >
                <div className="space-y-2" style={{ width: 140 }}>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-6 w-full rounded" />
                </div>
                <Skeleton className="h-5 w-12 rounded-full" />
                <div className="space-y-1" style={{ width: 80 }}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-1 justify-end" style={{ width: 60 }}>
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

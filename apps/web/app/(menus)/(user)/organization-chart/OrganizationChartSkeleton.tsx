import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * OrganizationChartClient のスケルトン
 * 検索バー + フィルタ + ツリー状の4部門（うち2つは配下セクション付き）
 */
export function OrganizationChartSkeleton() {
  return (
    <div className="max-w-7xl mx-auto">
      <Card>
        <CardContent className="p-6">
          {/* 検索・フィルターバー */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <Skeleton className="h-9 flex-1 w-full sm:max-w-sm" />
            <Skeleton className="h-9 w-full sm:w-[180px]" />
            <Skeleton className="h-8 w-24" />
          </div>

          {/* 組織ツリー */}
          <div className="space-y-3">
            {/* 部門1（セクション2つ付き） */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="ml-6 mt-2 space-y-2">
                <div className="rounded border p-2 flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-8 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="rounded border p-2 flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>

            {/* 部門2（セクション1つ付き） */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="ml-6 mt-2 space-y-2">
                <div className="rounded border p-2 flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-8 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>

            {/* 部門3（セクションなし） */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>

            {/* 部門4（セクションなし） */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/**
 * AIChatClient のスケルトン
 * ヘッダーバー + ウェルカムエリア + 入力エリア
 */
export function AIChatSkeleton() {
  return (
    <div className="flex-1 flex overflow-hidden min-h-0 w-full">
      <div className="flex flex-col overflow-hidden min-h-0 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>

        {/* Messages area (welcome) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="w-16 h-16 rounded-full mx-auto" />
            <Skeleton className="h-7 w-72 mx-auto" />
            <Skeleton className="h-4 w-56 mx-auto" />
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <Skeleton className="h-9 w-44 rounded-full" />
              <Skeleton className="h-9 w-48 rounded-full" />
              <Skeleton className="h-9 w-40 rounded-full" />
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 py-3 border-t">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

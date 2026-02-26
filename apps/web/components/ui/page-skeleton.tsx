import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  headerHeight?: string;
  headerWidth?: string;
  contentHeight?: string;
  className?: string;
}

function PageSkeleton({
  headerHeight = "h-10",
  headerWidth = "w-64",
  contentHeight = "h-[400px]",
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className={cn(headerHeight, headerWidth)} />
      <Skeleton className={cn(contentHeight, "w-full")} />
    </div>
  );
}

export { PageSkeleton };
export type { PageSkeletonProps };

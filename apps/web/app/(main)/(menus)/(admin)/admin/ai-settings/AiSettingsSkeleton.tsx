import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TabId } from "./types";

function LabelInputSkeleton({ labelWidth = "w-28", inputWidth = "w-full" }: { labelWidth?: string; inputWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className={`h-9 ${inputWidth}`} />
    </div>
  );
}

export function GeneralSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 mt-1" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-6 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </div>
        <LabelInputSkeleton inputWidth="w-full md:w-[300px]" />
        <LabelInputSkeleton labelWidth="w-32" inputWidth="w-full md:w-[300px]" />
        <LabelInputSkeleton labelWidth="w-32" />
        <LabelInputSkeleton labelWidth="w-20" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function PlaygroundSkeleton() {
  return (
    <>
      <Card>
        <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-28" />)}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
        <CardContent className="space-y-4">
          <LabelInputSkeleton labelWidth="w-32" />
          <LabelInputSkeleton labelWidth="w-20" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-[120px] w-full" />
                <Skeleton className="h-[120px] w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end"><Skeleton className="h-9 w-16" /></div>
    </>
  );
}

export function AiSettingsSkeleton({ tab }: { tab: TabId }) {
  return (
    <div className={`${tab === "playground" ? "max-w-6xl" : "max-w-4xl"} mx-auto mt-8 space-y-6`}>
      {tab === "general" && <GeneralSkeleton />}
      {tab === "playground" && <PlaygroundSkeleton />}
    </div>
  );
}

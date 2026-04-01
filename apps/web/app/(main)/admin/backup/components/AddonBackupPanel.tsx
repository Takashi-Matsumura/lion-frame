"use client";

import { Suspense, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { moduleRegistry } from "@/lib/modules/registry";
import { addonBackupComponents } from "@/lib/addon-modules/backup/addon-backup-registry";
import { backupTranslations } from "../translations";
import type { AppModule } from "@/types/module";
import { cn } from "@/lib/utils";

interface AddonBackupPanelProps {
  language: "en" | "ja";
}

export function AddonBackupPanel({ language }: AddonBackupPanelProps) {
  const t = backupTranslations[language];

  // backupProvider を持ち、コンポーネントが登録されているモジュール（有効/無効問わず）
  const addonModules = Object.values(moduleRegistry).filter(
    (m) => m.backupProvider && addonBackupComponents[m.id],
  );

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    addonModules.length > 0 ? addonModules[0].id : null,
  );

  if (addonModules.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            message={t.addonEmpty}
            description={t.addonEmptyDescription}
          />
        </CardContent>
      </Card>
    );
  }

  const selectedModule = addonModules.find((m) => m.id === selectedModuleId);

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* サイドバー */}
      <div className="w-56 shrink-0">
        <nav className="space-y-1">
          {addonModules.map((module) => {
            const name = language === "ja" ? module.nameJa : module.name;
            const isSelected = module.id === selectedModuleId;

            return (
              <button
                key={module.id}
                onClick={() => setSelectedModuleId(module.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">
                  {module.icon}
                </span>
                <span className="truncate">{name}</span>
                {!module.enabled && (
                  <span
                    className={cn(
                      "ml-auto text-[10px] px-1.5 py-0.5 rounded font-normal shrink-0",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/15 text-muted-foreground",
                    )}
                  >
                    {language === "ja" ? "無効" : "Off"}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 min-w-0">
        {selectedModule && (
          <AddonBackupContent module={selectedModule} language={language} />
        )}
      </div>
    </div>
  );
}

function AddonBackupContent({
  module,
  language,
}: {
  module: AppModule;
  language: "en" | "ja";
}) {
  const BackupComponent = addonBackupComponents[module.id];
  if (!BackupComponent) return null;

  const name = language === "ja" ? module.nameJa : module.name;
  const description = module.backupProvider
    ? language === "ja"
      ? module.backupProvider.descriptionJa
      : module.backupProvider.description
    : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {module.icon}
          {name}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          }
        >
          <BackupComponent language={language} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoreBackupPanel } from "./components/CoreBackupPanel";
import { AddonBackupPanel } from "./components/AddonBackupPanel";
import { backupTranslations } from "./translations";

interface BackupClientProps {
  language: "en" | "ja";
}

export function BackupClient({ language }: BackupClientProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "core";
  const t = backupTranslations[language];

  return (
    <div className="space-y-6">
      {tab === "core" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <CoreBackupPanel language={language} />
          </CardContent>
        </Card>
      )}

      {tab === "addon" && <AddonBackupPanel language={language} />}
    </div>
  );
}

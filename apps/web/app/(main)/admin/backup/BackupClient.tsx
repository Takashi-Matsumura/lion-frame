"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateBackupTab } from "./components/CreateBackupTab";
import { BackupHistoryTab } from "./components/BackupHistoryTab";
import { RestoreTab } from "./components/RestoreTab";
import { backupTranslations } from "./translations";

interface BackupClientProps {
  language: "en" | "ja";
}

export function BackupClient({ language }: BackupClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "create";
  const t = backupTranslations[language];

  const tabs = [
    { id: "create", label: t.tabCreate },
    { id: "history", label: t.tabHistory },
    { id: "restore", label: t.tabRestore },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-border mb-6">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => router.replace(`?tab=${item.id}`)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === item.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "create" && <CreateBackupTab language={language} />}
          {tab === "history" && <BackupHistoryTab language={language} />}
          {tab === "restore" && <RestoreTab language={language} />}
        </CardContent>
      </Card>
    </div>
  );
}

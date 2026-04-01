"use client";

import { useState } from "react";
import { CreateBackupTab } from "./CreateBackupTab";
import { BackupHistoryTab } from "./BackupHistoryTab";
import { RestoreTab } from "./RestoreTab";
import { backupTranslations } from "../translations";

interface CoreBackupPanelProps {
  language: "en" | "ja";
}

export function CoreBackupPanel({ language }: CoreBackupPanelProps) {
  const [subtab, setSubtab] = useState("create");
  const t = backupTranslations[language];

  const tabs = [
    { id: "create", label: t.tabCreate },
    { id: "history", label: t.tabHistory },
    { id: "restore", label: t.tabRestore },
  ];

  return (
    <>
      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubtab(item.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subtab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subtab === "create" && <CreateBackupTab language={language} />}
      {subtab === "history" && <BackupHistoryTab language={language} />}
      {subtab === "restore" && <RestoreTab language={language} />}
    </>
  );
}

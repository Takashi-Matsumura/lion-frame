"use client";

import { useState } from "react";
import NewRequestForm from "./components/NewRequestForm";
import MyRequests from "./components/MyRequests";
import { requestTranslations } from "./translations";

interface RequestsClientProps {
  language: "en" | "ja";
}

export default function RequestsClient({ language }: RequestsClientProps) {
  const t = requestTranslations[language];
  const [activeTab, setActiveTab] = useState<"new" | "list">("new");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmitted = () => {
    setActiveTab("list");
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "new"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.newRequest}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "list"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.myRequests}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "new" && (
        <NewRequestForm language={language} onSubmitted={handleSubmitted} />
      )}
      {activeTab === "list" && (
        <MyRequests language={language} key={refreshKey} />
      )}
    </div>
  );
}

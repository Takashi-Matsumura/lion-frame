"use client";

import { useState } from "react";
import ResourceBrowser from "./components/ResourceBrowser";
import MyReservations from "./components/MyReservations";
import { reservationTranslations } from "./translations";

interface ReservationsClientProps {
  language: "en" | "ja";
}

export default function ReservationsClient({
  language,
}: ReservationsClientProps) {
  const t = reservationTranslations[language];
  const [activeTab, setActiveTab] = useState<"browse" | "my">("browse");

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "browse"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.browse}
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "my"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.myReservations}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "browse" && <ResourceBrowser language={language} />}
      {activeTab === "my" && <MyReservations language={language} />}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { handsonTranslations } from "./translations";
import { fetchPublishedDocuments } from "./api";
import type { Language, DocOption } from "./types";

interface Props {
  language: Language;
  loading: boolean;
  onSubmit: (params: { title: string; date: string; documentId: string; maxSeats: number }) => void;
  onCancel: () => void;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function SessionCreateForm({ language, loading, onSubmit, onCancel }: Props) {
  const t = handsonTranslations[language].sessionManager;
  const [documents, setDocuments] = useState<DocOption[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }),
  );
  const [documentId, setDocumentId] = useState("");
  const [maxSeats, setMaxSeats] = useState(15);

  useEffect(() => {
    fetchPublishedDocuments()
      .then((docs) => setDocuments(docs))
      .catch(() => {});
  }, []);

  function handleSubmit() {
    if (!title.trim() || !date || !documentId) return;
    onSubmit({ title: title.trim(), date, documentId, maxSeats });
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{t.sessionTitle}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t.sessionDate}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-48 ${INPUT_CLASS}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t.maxSeats}</label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxSeats}
              onChange={(e) => setMaxSeats(parseInt(e.target.value, 10) || 15)}
              className={`w-24 ${INPUT_CLASS}`}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{t.selectDocument}</label>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noDocuments}</p>
          ) : (
            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">---</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={loading || !title.trim() || !date || !documentId}
        >
          {t.create}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}

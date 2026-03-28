"use client";

import { useState, useEffect } from "react";
import SessionManager from "@/components/handson/SessionManager";
import ProgressMatrix from "@/components/handson/ProgressMatrix";
import SessionAnalytics from "@/components/handson/SessionAnalytics";
import HandsonMarkdownRenderer from "@/components/handson/HandsonMarkdownRenderer";
import { parseHandsonMarkdown } from "@/lib/addon-modules/handson/markdown-parser";
import type { ParsedHandson } from "@/lib/addon-modules/handson/markdown-parser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const translations = {
  en: {
    progressTab: "Progress",
    previewTab: "Content Preview",
    analyticsTab: "Analytics",
    selectSession: "Select a session from the list above to view details.",
  },
  ja: {
    progressTab: "進捗",
    previewTab: "教材プレビュー",
    analyticsTab: "分析",
    selectSession: "上のリストからセッションを選択してください。",
  },
};

interface SessionInfo {
  id: string;
  title: string;
  documentId: string;
  maxSeats: number;
  startedAt: string;
  endedAt: string | null;
}

interface Props {
  language: "en" | "ja";
  activeSessionId: string | null;
  onActiveChanged: (activeId: string | null) => void;
}

export default function InstructorView({
  language,
  activeSessionId: initialActiveId,
  onActiveChanged,
}: Props) {
  const t = translations[language];
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialActiveId);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
  const [parsed, setParsed] = useState<ParsedHandson | null>(null);
  const [activeTab, setActiveTab] = useState("progress");
  const [pageReady, setPageReady] = useState(false);

  // ドキュメント読み込み
  useEffect(() => {
    if (!selectedSession) {
      setParsed(null);
      return;
    }
    fetchDocument(selectedSession.id);
  }, [selectedSession?.id]);

  async function fetchDocument(sessionId: string) {
    try {
      const res = await fetch(`/api/handson/sessions/${sessionId}/document`);
      if (res.ok) {
        const data = await res.json();
        const result = parseHandsonMarkdown(data.document.content);
        setParsed(result);
      }
    } catch {
      // ignore
    }
  }

  function handleActiveChanged(newActiveId: string | null) {
    setActiveSessionId(newActiveId);
    onActiveChanged(newActiveId);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 初期ロード中はPageSkeleton */}
      {!pageReady && <div className="p-6"><PageSkeleton /></div>}

      <div className={`flex-1 overflow-y-auto p-6 ${!pageReady ? "hidden" : ""}`}>
        <div className="mx-auto max-w-6xl space-y-6">
          {/* セッション一覧 + 管理 */}
          <Card>
            <CardContent className="pt-6">
              <SessionManager
                language={language}
                activeSessionId={activeSessionId}
                onSessionSelected={(s) => setSelectedSession(s as SessionInfo | null)}
                onActiveChanged={handleActiveChanged}
                onLoaded={() => setPageReady(true)}
              />
            </CardContent>
          </Card>

          {/* 選択中セッションの詳細タブ */}
          {selectedSession ? (
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedSession.title}</CardTitle>
                    <TabsList>
                      <TabsTrigger value="progress">{t.progressTab}</TabsTrigger>
                      <TabsTrigger value="preview">{t.previewTab}</TabsTrigger>
                      {selectedSession.endedAt && (
                        <TabsTrigger value="analytics">{t.analyticsTab}</TabsTrigger>
                      )}
                    </TabsList>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <TabsContent value="progress" className="mt-0">
                    <ProgressMatrix
                      language={language}
                      sessionId={selectedSession.id}
                      totalCommands={parsed?.totalCommands ?? 0}
                      onCommandClick={(commandIndex) => {
                        setActiveTab("preview");
                        setTimeout(() => {
                          const el = document.getElementById(`handson-cmd-${commandIndex}`);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 100);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-0">
                    {parsed ? (
                      <div className="mx-auto max-w-3xl">
                        <HandsonMarkdownRenderer
                          language={language}
                          parsed={parsed}
                          readOnly
                          onInstructorCheckpoint={async (commandIndex) => {
                            await fetch(`/api/handson/sessions/${selectedSession.id}/log`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                participantId: "instructor",
                                type: "INSTRUCTOR_CHECKPOINT",
                                commandIndex,
                              }),
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {language === "ja" ? "教材を読み込み中..." : "Loading content..."}
                      </div>
                    )}
                  </TabsContent>
                  {selectedSession.endedAt && (
                    <TabsContent value="analytics" className="mt-0">
                      <SessionAnalytics
                        language={language}
                        sessionId={selectedSession.id}
                      />
                    </TabsContent>
                  )}
                </CardContent>
              </Tabs>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-sm text-muted-foreground">
                  {t.selectSession}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

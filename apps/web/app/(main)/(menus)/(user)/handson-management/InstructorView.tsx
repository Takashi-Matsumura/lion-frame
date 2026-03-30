"use client";

import { useState, useEffect } from "react";
import SessionManager from "@/components/handson/SessionManager";
import ProgressMatrix from "@/components/handson/ProgressMatrix";
import SessionAnalytics from "@/components/handson/SessionAnalytics";
import HandsonMarkdownRenderer from "@/components/handson/HandsonMarkdownRenderer";
import { useFetchDocument } from "@/components/handson/hooks";
import { fetchActiveSessions, postLog } from "@/components/handson/api";
import { handsonTranslations } from "@/components/handson/translations";
import type { Language, SessionInfo } from "@/components/handson/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstructorViewSkeleton } from "@/components/handson/skeletons";

interface Props {
  language: Language;
  userId: string;
  userRole: string;
}

export default function InstructorView({ language, userId, userRole }: Props) {
  const t = handsonTranslations[language].instructor;
  const tc = handsonTranslations[language].common;

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [rehearsalSessionId, setRehearsalSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
  const [activeTab, setActiveTab] = useState("progress");
  const [pageReady, setPageReady] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const { parsed } = useFetchDocument(selectedSession?.id ?? null);

  // 初回マウント時にアクティブ/リハーサルセッションIDを取得
  useEffect(() => {
    fetchActiveSessions()
      .then((data) => {
        const active = data.availableSessions?.find((s) => s.mode === "active");
        if (active) setActiveSessionId(active.id);
        if (data.rehearsalSessionId) setRehearsalSessionId(data.rehearsalSessionId);
      })
      .catch(() => {})
      .finally(() => setInitialLoaded(true));
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 初期ロード中はスケルトン */}
      {(!pageReady || !initialLoaded) && <InstructorViewSkeleton />}

      <div className={`flex-1 overflow-y-auto p-6 ${!pageReady || !initialLoaded ? "hidden" : ""}`}>
        <div className="mx-auto max-w-6xl space-y-6">
          {/* セッション一覧 + 管理 */}
          <Card>
            <CardContent className="pt-6">
              <SessionManager
                language={language}
                userId={userId}
                userRole={userRole}
                activeSessionId={activeSessionId}
                rehearsalSessionId={rehearsalSessionId}
                onSessionSelected={(s) => {
                  setSelectedSession(s as SessionInfo | null);
                  if (s && (s as SessionInfo).endedAt) {
                    setActiveTab("analytics");
                  } else {
                    setActiveTab("progress");
                  }
                }}
                onActiveChanged={setActiveSessionId}
                onRehearsalChanged={setRehearsalSessionId}
                onLoaded={() => setPageReady(true)}
              />
            </CardContent>
          </Card>

          {/* 選択中セッションの詳細タブ */}
          {selectedSession ? (() => {
            const isLive = !selectedSession.endedAt && (
              activeSessionId === selectedSession.id ||
              rehearsalSessionId === selectedSession.id
            );
            return (
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedSession.title}</CardTitle>
                    <TabsList>
                      {isLive && (
                        <TabsTrigger value="progress">{t.progressTab}</TabsTrigger>
                      )}
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
                            await postLog(selectedSession.id, {
                              participantId: "instructor",
                              type: "INSTRUCTOR_CHECKPOINT",
                              commandIndex,
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {tc.loadingContent}
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
            );
          })() : (
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

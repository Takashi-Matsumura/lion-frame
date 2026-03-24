"use client";

import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";

interface BadgesTabProps {
  language: "en" | "ja";
}

type DocStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type DocVisibility = "PRIVATE" | "DEPARTMENT" | "ORGANIZATION";

const statusBadgeExamples: { status: DocStatus; visibility: DocVisibility }[] = [
  { status: "DRAFT", visibility: "PRIVATE" },
  { status: "DRAFT", visibility: "DEPARTMENT" },
  { status: "DRAFT", visibility: "ORGANIZATION" },
  { status: "PUBLISHED", visibility: "DEPARTMENT" },
  { status: "PUBLISHED", visibility: "ORGANIZATION" },
  { status: "ARCHIVED", visibility: "PRIVATE" },
];

export function BadgesTab({ language }: BadgesTabProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">
          {t("Badge Management", "バッジ管理")}
        </h3>
      </div>

      <div className="space-y-8">
        {/* ステータスバッジセクション */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-semibold text-foreground">
              {t("Status Badges", "ステータスバッジ")}
            </h4>
            <Badge variant="secondary" className="text-xs">
              {t("Editor", "エディタ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t(
              "Badges that indicate document status and visibility scope.",
              "ドキュメントのステータスと公開範囲を示すバッジです。",
            )}
          </p>

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left font-medium px-4 py-2.5">
                    {t("Badge", "バッジ")}
                  </th>
                  <th className="text-left font-medium px-4 py-2.5">
                    {t("Status", "ステータス")}
                  </th>
                  <th className="text-left font-medium px-4 py-2.5">
                    {t("Visibility", "公開範囲")}
                  </th>
                  <th className="text-left font-medium px-4 py-2.5">
                    {t("Description", "説明")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {statusBadgeExamples.map(({ status, visibility }) => (
                  <tr key={`${status}-${visibility}`} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <StatusBadge status={status} visibility={visibility} language={language} size="md" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getStatusLabel(status, language)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getVisibilityLabel(visibility, language)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getDescription(status, visibility, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 将来の拡張エリア */}
        <section className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {t(
              "Custom badge definitions will be available here in a future update.",
              "カスタムバッジの定義機能は今後のアップデートで追加予定です。",
            )}
          </p>
        </section>
      </div>
    </>
  );
}

function getStatusLabel(status: DocStatus, language: "en" | "ja"): string {
  const labels: Record<DocStatus, { en: string; ja: string }> = {
    DRAFT: { en: "Draft", ja: "下書き" },
    PUBLISHED: { en: "Published", ja: "公開" },
    ARCHIVED: { en: "Archived", ja: "アーカイブ" },
  };
  return language === "ja" ? labels[status].ja : labels[status].en;
}

function getVisibilityLabel(visibility: DocVisibility, language: "en" | "ja"): string {
  const labels: Record<DocVisibility, { en: string; ja: string }> = {
    PRIVATE: { en: "Private", ja: "個人" },
    DEPARTMENT: { en: "Department", ja: "部署内" },
    ORGANIZATION: { en: "Organization", ja: "全社" },
  };
  return language === "ja" ? labels[visibility].ja : labels[visibility].en;
}

function getDescription(status: DocStatus, visibility: DocVisibility, language: "en" | "ja"): string {
  const key = `${status}-${visibility}`;
  const descriptions: Record<string, { en: string; ja: string }> = {
    "DRAFT-PRIVATE": { en: "Personal draft, visible only to the author", ja: "個人の下書き。作成者のみ閲覧可" },
    "DRAFT-DEPARTMENT": { en: "Draft with department scope set", ja: "部署内公開予定の下書き" },
    "DRAFT-ORGANIZATION": { en: "Draft with organization scope set", ja: "全社公開予定の下書き" },
    "PUBLISHED-DEPARTMENT": { en: "Published within the department", ja: "部署内に公開中" },
    "PUBLISHED-ORGANIZATION": { en: "Published to the entire organization", ja: "全社に公開中" },
    "ARCHIVED-PRIVATE": { en: "Archived document, no longer active", ja: "アーカイブ済み。非アクティブ" },
  };
  const desc = descriptions[key];
  return desc ? (language === "ja" ? desc.ja : desc.en) : "";
}

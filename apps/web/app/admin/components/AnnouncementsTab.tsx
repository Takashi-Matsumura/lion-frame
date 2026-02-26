"use client";

import { Bell, Edit3, Megaphone, Plus, RefreshCw, Shield, Trash2, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FaBullhorn } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type AnnouncementTemplate,
  type TemplateCategory,
  applyPlaceholders,
  getAnnouncementTemplates,
  getDefaultPlaceholderValues,
  getTemplateById,
} from "@/lib/core-modules/system/announcement-templates";
import type { Announcement, AnnouncementFormState } from "@/types/admin";

interface AnnouncementsTabProps {
  language: "en" | "ja";
}

export function AnnouncementsTab({ language }: AnnouncementsTabProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // アナウンスの状態
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] =
    useState<AnnouncementFormState>({
      title: "",
      titleJa: "",
      message: "",
      messageJa: "",
      level: "info",
      startAt: "",
      endAt: "",
      notifyUsers: false,
    });
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [showAnnouncementDeleteModal, setShowAnnouncementDeleteModal] =
    useState(false);
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<Announcement | null>(null);
  const [announcementDeleting, setAnnouncementDeleting] = useState(false);

  // テンプレートの状態
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [placeholderValues, setPlaceholderValues] = useState<
    Record<string, string>
  >({});

  // AI翻訳の状態
  const [aiTranslationAvailable, setAiTranslationAvailable] = useState(false);
  const [useAiTranslation, setUseAiTranslation] = useState(false);
  const [aiTranslating, setAiTranslating] = useState(false);

  // datetime-local入力用にローカル時刻をフォーマット (YYYY-MM-DDTHH:MM)
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // アナウンスを取得
  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);
      const response = await fetch("/api/admin/announcements");
      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }

      const data = await response.json();
      setAnnouncements(data.announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // AI翻訳の利用可否をチェック
  const checkAiTranslation = async () => {
    try {
      const response = await fetch("/api/ai/translate");
      if (response.ok) {
        const data = await response.json();
        setAiTranslationAvailable(data.available);
        return data.available;
      }
    } catch {
      setAiTranslationAvailable(false);
    }
    return false;
  };

  // アナウンスモーダルを開く（新規作成）
  const openNewAnnouncementModal = async () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({
      title: "",
      titleJa: "",
      message: "",
      messageJa: "",
      level: "info",
      startAt: formatLocalDateTime(new Date()),
      endAt: "",
      notifyUsers: false,
    });
    setSelectedTemplateId(null);
    setPlaceholderValues({});
    setUseAiTranslation(false);
    setShowAnnouncementModal(true);

    const available = await checkAiTranslation();
    if (available) {
      setUseAiTranslation(true); // デフォルトでON
    }
  };

  // テンプレートからアナウンス作成
  const openTemplateModal = async (template: AnnouncementTemplate) => {
    setEditingAnnouncement(null);
    setSelectedTemplateId(template.id);
    const defaults = getDefaultPlaceholderValues(template);
    setPlaceholderValues(defaults);
    setAnnouncementForm({
      title: applyPlaceholders(template.title, defaults, "en"),
      titleJa: applyPlaceholders(template.titleJa, defaults, "ja"),
      message: applyPlaceholders(template.message, defaults, "en"),
      messageJa: applyPlaceholders(template.messageJa, defaults, "ja"),
      level: template.level,
      startAt: formatLocalDateTime(new Date()),
      endAt: "",
      notifyUsers: template.notifyUsers,
    });
    setUseAiTranslation(false);
    setShowAnnouncementModal(true);
    const available = await checkAiTranslation();
    if (available) setUseAiTranslation(true);
  };

  // プレースホルダー値変更ハンドラ
  const handlePlaceholderChange = (key: string, value: string) => {
    const template = selectedTemplateId
      ? getTemplateById(selectedTemplateId)
      : null;
    if (!template) return;
    const newValues = { ...placeholderValues, [key]: value };
    setPlaceholderValues(newValues);
    setAnnouncementForm((f) => ({
      ...f,
      title: applyPlaceholders(template.title, newValues, "en"),
      titleJa: applyPlaceholders(template.titleJa, newValues, "ja"),
      message: applyPlaceholders(template.message, newValues, "en"),
      messageJa: applyPlaceholders(template.messageJa, newValues, "ja"),
    }));
  };

  // アナウンスモーダルを開く（編集）
  const openEditAnnouncementModal = async (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      titleJa: announcement.titleJa || "",
      message: announcement.message,
      messageJa: announcement.messageJa || "",
      level: announcement.level,
      startAt: formatLocalDateTime(new Date(announcement.startAt)),
      endAt: announcement.endAt
        ? formatLocalDateTime(new Date(announcement.endAt))
        : "",
      notifyUsers: false,
    });
    setUseAiTranslation(false);
    setShowAnnouncementModal(true);

    await checkAiTranslation();
  };

  // アナウンスを保存
  const handleSaveAnnouncement = async () => {
    if (!announcementForm.titleJa || !announcementForm.messageJa) {
      alert(
        t("Title and message are required", "タイトルとメッセージは必須です"),
      );
      return;
    }

    try {
      setAnnouncementSaving(true);

      let titleEn = announcementForm.title;
      let messageEn = announcementForm.message;

      // AI翻訳が有効で、英語フィールドが空の場合は翻訳を実行
      if (useAiTranslation && aiTranslationAvailable) {
        if (!titleEn && announcementForm.titleJa) {
          setAiTranslating(true);
          try {
            const response = await fetch("/api/ai/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: announcementForm.titleJa,
                sourceLanguage: "ja",
                targetLanguage: "en",
              }),
            });
            if (response.ok) {
              const data = await response.json();
              titleEn = data.translatedText;
            }
          } catch (error) {
            console.error("Error translating title:", error);
          }
        }

        if (!messageEn && announcementForm.messageJa) {
          try {
            const response = await fetch("/api/ai/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: announcementForm.messageJa,
                sourceLanguage: "ja",
                targetLanguage: "en",
              }),
            });
            if (response.ok) {
              const data = await response.json();
              messageEn = data.translatedText;
            }
          } catch (error) {
            console.error("Error translating message:", error);
          }
        }
        setAiTranslating(false);
      }

      const url = editingAnnouncement
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : "/api/admin/announcements";
      const method = editingAnnouncement ? "PATCH" : "POST";

      // 日本語が必須、英語は任意（翻訳結果または日本語をフォールバック）
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleEn || announcementForm.titleJa,
          titleJa: announcementForm.titleJa,
          message: messageEn || announcementForm.messageJa,
          messageJa: announcementForm.messageJa,
          level: announcementForm.level,
          startAt: announcementForm.startAt,
          endAt: announcementForm.endAt || null,
          ...(!editingAnnouncement && {
            notifyUsers: announcementForm.notifyUsers,
          }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save announcement");
      }

      setShowAnnouncementModal(false);
      await fetchAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert(t("Failed to save announcement", "アナウンスの保存に失敗しました"));
    } finally {
      setAnnouncementSaving(false);
    }
  };

  // アナウンスの有効/無効を切り替え
  const handleToggleAnnouncement = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update announcement");
      }

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive } : a)),
      );
    } catch (error) {
      console.error("Error toggling announcement:", error);
      alert(
        t("Failed to update announcement", "アナウンスの更新に失敗しました"),
      );
    }
  };

  // アナウンスを削除
  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;

    try {
      setAnnouncementDeleting(true);
      const response = await fetch(
        `/api/admin/announcements/${announcementToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete announcement");
      }

      setShowAnnouncementDeleteModal(false);
      setAnnouncementToDelete(null);
      await fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert(
        t("Failed to delete announcement", "アナウンスの削除に失敗しました"),
      );
    } finally {
      setAnnouncementDeleting(false);
    }
  };

  return (
    <>
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">
                {t("System Announcements", "システムアナウンス")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Create and manage system-wide announcements.",
                  "システム全体のアナウンスを作成・管理できます。",
                )}
              </p>
            </div>
            <Button onClick={openNewAnnouncementModal} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("New Announcement", "新規作成")}
            </Button>
          </div>

          {/* テンプレートパネル */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              {t("Quick Create from Template", "テンプレートから作成")}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {getAnnouncementTemplates()
                .filter((tmpl) => tmpl.id !== "general-notice")
                .map((tmpl) => {
                  const categoryIcons: Record<
                    TemplateCategory,
                    typeof Wrench
                  > = {
                    maintenance: Wrench,
                    security: Shield,
                    update: RefreshCw,
                    general: Megaphone,
                  };
                  const levelColors: Record<string, string> = {
                    critical:
                      "border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950",
                    warning:
                      "border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950",
                    info: "border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950",
                  };
                  const Icon = categoryIcons[tmpl.category];
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => openTemplateModal(tmpl)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors cursor-pointer ${levelColors[tmpl.level] ?? ""}`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {language === "ja" ? tmpl.nameJa : tmpl.name}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ローディング */}
          {announcementsLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="mt-4 text-muted-foreground">
                {t("Loading...", "読み込み中...")}
              </p>
            </div>
          )}

          {/* アナウンス一覧 */}
          {!announcementsLoading && announcements.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
              {announcements.map((announcement) => {
                const now = new Date();
                const startAt = new Date(announcement.startAt);
                const endAt = announcement.endAt
                  ? new Date(announcement.endAt)
                  : null;
                const isScheduled = startAt > now;
                const isExpired = endAt && endAt < now;
                const isLive =
                  announcement.isActive && !isScheduled && !isExpired;

                return (
                  <div
                    key={announcement.id}
                    className={`p-4 rounded-lg border ${
                      announcement.level === "critical"
                        ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                        : announcement.level === "warning"
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
                          : "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                    } ${!announcement.isActive && "opacity-60"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={
                              announcement.level === "critical"
                                ? "bg-red-100 text-red-700 border-red-300"
                                : announcement.level === "warning"
                                  ? "bg-amber-100 text-amber-700 border-amber-300"
                                  : "bg-blue-100 text-blue-700 border-blue-300"
                            }
                          >
                            {announcement.level === "critical" &&
                              t("Critical", "重要")}
                            {announcement.level === "warning" &&
                              t("Warning", "警告")}
                            {announcement.level === "info" &&
                              t("Info", "お知らせ")}
                          </Badge>
                          {isLive && (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              {t("Live", "配信中")}
                            </Badge>
                          )}
                          {isScheduled && (
                            <Badge
                              variant="outline"
                              className="bg-gray-100 text-gray-700 border-gray-300"
                            >
                              {t("Scheduled", "予約済み")}
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge
                              variant="outline"
                              className="bg-gray-100 text-gray-500 border-gray-300"
                            >
                              {t("Expired", "終了")}
                            </Badge>
                          )}
                        </div>

                        <h4 className="font-semibold text-foreground mb-1">
                          {language === "ja" && announcement.titleJa
                            ? announcement.titleJa
                            : announcement.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {language === "ja" && announcement.messageJa
                            ? announcement.messageJa
                            : announcement.message}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {t("Start", "開始")}:{" "}
                            {new Date(announcement.startAt).toLocaleString(
                              language === "ja" ? "ja-JP" : "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          {announcement.endAt && (
                            <span>
                              {t("End", "終了")}:{" "}
                              {new Date(announcement.endAt).toLocaleString(
                                language === "ja" ? "ja-JP" : "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          )}
                          <span>
                            {t("By", "作成者")}:{" "}
                            {announcement.creator.name ||
                              announcement.creator.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={announcement.isActive}
                          onCheckedChange={(checked) =>
                            handleToggleAnnouncement(announcement.id, checked)
                          }
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  openEditAnnouncementModal(announcement)
                                }
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("Edit", "編集")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setAnnouncementToDelete(announcement);
                                  setShowAnnouncementDeleteModal(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("Delete", "削除")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* データなし */}
          {!announcementsLoading && announcements.length === 0 && (
            <EmptyState
              icon={
                <FaBullhorn className="w-12 h-12 text-muted-foreground" />
              }
              message={t(
                "No announcements yet",
                "アナウンスはまだありません",
              )}
              action={
                <Button
                  onClick={openNewAnnouncementModal}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t(
                    "Create First Announcement",
                    "最初のアナウンスを作成",
                  )}
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* アナウンス作成/編集モーダル */}
      <Dialog
        open={showAnnouncementModal}
        onOpenChange={(open) => !open && setShowAnnouncementModal(false)}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement
                ? t("Edit Announcement", "アナウンスを編集")
                : t("New Announcement", "新規アナウンス")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Create announcements to notify all users about important information.",
                "重要な情報を全ユーザに通知するアナウンスを作成します。",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
            {/* プレースホルダー入力（テンプレート選択時のみ） */}
            {!editingAnnouncement &&
              selectedTemplateId &&
              (() => {
                const tmpl = getTemplateById(selectedTemplateId);
                return (
                  tmpl &&
                  tmpl.placeholders.length > 0 && (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t(
                          "Template Parameters",
                          "テンプレートパラメータ",
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {tmpl.placeholders.map((ph) => (
                          <div key={ph.key} className="space-y-1">
                            <Label className="text-xs">
                              {language === "ja" ? ph.labelJa : ph.label}
                            </Label>
                            <Input
                              type={ph.type}
                              value={placeholderValues[ph.key] ?? ""}
                              onChange={(e) =>
                                handlePlaceholderChange(
                                  ph.key,
                                  e.target.value,
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                );
              })()}

            {/* タイトル（日本語） */}
            <div className="space-y-2">
              <Label htmlFor="titleJa">
                {t("Title (Japanese)", "タイトル（日本語）")} *
              </Label>
              <Input
                id="titleJa"
                value={announcementForm.titleJa}
                onChange={(e) =>
                  setAnnouncementForm((f) => ({
                    ...f,
                    titleJa: e.target.value,
                  }))
                }
                placeholder={t(
                  "Enter title in Japanese",
                  "日本語でタイトルを入力",
                )}
              />
            </div>

            {/* タイトル（英語） */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {t("Title (English)", "タイトル（英語）")}
              </Label>
              <Input
                id="title"
                value={announcementForm.title}
                onChange={(e) =>
                  setAnnouncementForm((f) => ({
                    ...f,
                    title: e.target.value,
                  }))
                }
                placeholder={t(
                  "Enter title in English (optional)",
                  "英語でタイトルを入力（任意）",
                )}
              />
            </div>

            {/* メッセージ（日本語） */}
            <div className="space-y-2">
              <Label htmlFor="messageJa">
                {t("Message (Japanese)", "メッセージ（日本語）")} *
              </Label>
              <Input
                id="messageJa"
                value={announcementForm.messageJa}
                onChange={(e) =>
                  setAnnouncementForm((f) => ({
                    ...f,
                    messageJa: e.target.value,
                  }))
                }
                placeholder={t(
                  "Enter message in Japanese",
                  "日本語でメッセージを入力",
                )}
              />
            </div>

            {/* メッセージ（英語） */}
            <div className="space-y-2">
              <Label htmlFor="message">
                {t("Message (English)", "メッセージ（英語）")}
              </Label>
              <Input
                id="message"
                value={announcementForm.message}
                onChange={(e) =>
                  setAnnouncementForm((f) => ({
                    ...f,
                    message: e.target.value,
                  }))
                }
                placeholder={t(
                  "Enter message in English (optional)",
                  "英語でメッセージを入力（任意）",
                )}
              />
            </div>

            {/* レベル */}
            <div className="space-y-2">
              <Label>{t("Level", "重要度")}</Label>
              <Select
                value={announcementForm.level}
                onValueChange={(value) =>
                  setAnnouncementForm((f) => ({
                    ...f,
                    level: value,
                    ...(!editingAnnouncement && {
                      notifyUsers:
                        value === "critical" || value === "warning",
                    }),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    {t("Info", "お知らせ")}
                  </SelectItem>
                  <SelectItem value="warning">
                    {t("Warning", "警告")}
                  </SelectItem>
                  <SelectItem value="critical">
                    {t("Critical", "重要")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI翻訳トグル */}
            {aiTranslationAvailable && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {t("AI Translation", "AI翻訳")}
                    </Label>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {t(
                        "Automatically translate to English if empty",
                        "英語が空の場合、自動で翻訳します",
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={useAiTranslation}
                  onCheckedChange={setUseAiTranslation}
                  disabled={announcementSaving || aiTranslating}
                />
              </div>
            )}

            {/* ユーザーに通知（新規作成時のみ） */}
            {!editingAnnouncement && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">
                      {t("Notify Users", "ユーザーに通知")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Send a notification to all users' notification bell",
                        "全ユーザーの通知ベルに通知を送信します",
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={announcementForm.notifyUsers}
                  onCheckedChange={(checked) =>
                    setAnnouncementForm((f) => ({
                      ...f,
                      notifyUsers: checked,
                    }))
                  }
                  disabled={announcementSaving}
                />
              </div>
            )}

            {/* 開始日時・終了日時 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startAt">
                  {t("Start Date/Time", "開始日時")}
                </Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={announcementForm.startAt}
                  onChange={(e) =>
                    setAnnouncementForm((f) => ({
                      ...f,
                      startAt: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">
                  {t("End Date/Time", "終了日時")}
                </Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={announcementForm.endAt}
                  onChange={(e) =>
                    setAnnouncementForm((f) => ({
                      ...f,
                      endAt: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Leave empty for no end date",
                    "空欄の場合は終了日時なし",
                  )}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAnnouncementModal(false)}
              disabled={announcementSaving || aiTranslating}
            >
              {t("Cancel", "キャンセル")}
            </Button>
            <Button
              onClick={handleSaveAnnouncement}
              disabled={
                announcementSaving ||
                aiTranslating ||
                !announcementForm.titleJa ||
                !announcementForm.messageJa
              }
            >
              {aiTranslating
                ? t("Translating...", "翻訳中...")
                : announcementSaving
                  ? t("Saving...", "保存中...")
                  : editingAnnouncement
                    ? t("Update", "更新")
                    : t("Create", "作成")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* アナウンス削除確認モーダル（DELETE入力式） */}
      <DeleteConfirmDialog
        open={showAnnouncementDeleteModal && !!announcementToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setShowAnnouncementDeleteModal(false);
            setAnnouncementToDelete(null);
          }
        }}
        title={t("Delete Announcement", "アナウンスを削除")}
        description={
          announcementToDelete
            ? t(
                `Are you sure you want to delete "${announcementToDelete.title}"? This action cannot be undone.`,
                `「${announcementToDelete.title}」を削除してもよろしいですか？この操作は取り消せません。`,
              )
            : ""
        }
        cancelLabel={t("Cancel", "キャンセル")}
        deleteLabel={
          announcementDeleting
            ? t("Deleting...", "削除中...")
            : t("Delete", "削除")
        }
        disabled={announcementDeleting}
        onDelete={handleDeleteAnnouncement}
        requireConfirmText="DELETE"
        confirmPrompt={t(
          'Type "DELETE" to confirm:',
          "確認のため「DELETE」と入力してください：",
        )}
      />
    </>
  );
}

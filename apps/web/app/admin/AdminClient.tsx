"use client";

import type { AccessKey, Role } from "@prisma/client";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Key,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaBullhorn } from "react-icons/fa";
import { AccessKeyManager } from "@/components/AccessKeyManager";
import { UserRoleChanger } from "@/components/UserRoleChanger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useSidebar } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { getModuleIcon } from "@/lib/modules/icons";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import type { AppMenu, AppModule } from "@/types/module";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  createdAt: string;
  lastSignInAt: string | null;
  forcePasswordChange?: boolean;
  passwordExpiresAt?: string | null;
}

interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

type AccessKeyWithTargetUser = AccessKey & {
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  _count: {
    userAccessKeys: number;
  };
};

interface AdminClientProps {
  language: "en" | "ja";
  currentUserId: string;
  accessKeys: AccessKeyWithTargetUser[];
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  }>;
  menus: AppMenu[];
  modules: AppModule[];
}

type TabType =
  | "system"
  | "users"
  | "access-keys"
  | "modules"
  | "announcements";

interface ContainerStatus {
  id: string;
  name: string;
  nameJa: string;
  required: boolean;
  description?: string;
  descriptionJa?: string;
  isRunning: boolean;
}

interface McpServerInfo {
  id: string;
  name: string;
  nameJa: string;
  description?: string;
  descriptionJa?: string;
  path: string;
  toolCount: number;
  readOnly: boolean;
  tools: Array<{
    name: string;
    descriptionJa: string;
  }>;
}

interface ModuleInfo {
  id: string;
  name: string;
  nameJa: string;
  description?: string;
  descriptionJa?: string;
  enabled: boolean;
  type: "core" | "addon";
  menuCount: number;
  menus: Array<{
    id: string;
    name: string;
    nameJa: string;
    path: string;
    menuGroup: string;
    enabled: boolean;
    order: number;
    requiredRoles: string[];
  }>;
  services: Array<{
    id: string;
    name: string;
    nameJa: string;
    description?: string;
    descriptionJa?: string;
    apiEndpoints: string[];
    enabled: boolean;
  }>;
  containers: ContainerStatus[];
  mcpServer: McpServerInfo | null;
}

interface ModulesData {
  modules: ModuleInfo[];
  statistics: {
    total: number;
    core: number;
    addons: number;
    enabled: number;
    disabled: number;
  };
}

export function AdminClient({
  language,
  currentUserId,
  accessKeys,
  users,
  menus,
  modules,
}: AdminClientProps) {
  const searchParams = useSearchParams();
  const { open } = useSidebar();
  const { width } = useSidebarStore();
  const activeTab = (searchParams.get("tab") as TabType) || "users";

  // アカウント管理タブの状態
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 1ページあたりのアイテム数
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [passwordStatusFilter, setPasswordStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "email" | "role" | "createdAt">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // パスワードリセットの状態
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);
  const [showResetPasswordResult, setShowResetPasswordResult] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);

  // 社員からアカウント作成の状態
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  const [showCreateResult, setShowCreateResult] = useState(false);
  const [candidateOrgId, setCandidateOrgId] = useState<string>("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateDeptFilter, setCandidateDeptFilter] = useState<string>("ALL");
  const [candidates, setCandidates] = useState<
    {
      employeeId: string;
      name: string;
      email: string | null;
      hasEmail: boolean;
      department: string;
      section: string | null;
      position: string;
      suggestedRole: string;
    }[]
  >([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, { role: string }>
  >({});
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [createResult, setCreateResult] = useState<{
    created: { name: string; email: string; role: string; temporaryPassword: string }[];
    skipped: number;
    errors: { employeeId: string; message: string }[];
  } | null>(null);
  const [organizations, setOrganizations] = useState<
    { id: string; name: string; departments: { id: string; name: string }[] }[]
  >([]);
  // 退職者アカウント管理の状態
  const [candidateTab, setCandidateTab] = useState<"create" | "retired">("create");
  const [retiredAccounts, setRetiredAccounts] = useState<
    { userId: string; name: string; email: string | null; role: string; department: string; position: string }[]
  >([]);
  const [retiredAccountsLoading, setRetiredAccountsLoading] = useState(false);
  const [selectedRetired, setSelectedRetired] = useState<Set<string>>(new Set());
  const [deletingRetired, setDeletingRetired] = useState(false);
  const [showRetiredDeleteConfirm, setShowRetiredDeleteConfirm] = useState(false);

  // モジュール管理タブの状態
  const [modulesData, setModulesData] = useState<ModulesData | null>(null);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleInfo | null>(null);
  const [expandedServices, setExpandedServices] = useState<
    Record<string, boolean>
  >({});
  const [mcpPanelOpen, setMcpPanelOpen] = useState(false);
  const [mcpApiKeyExists, setMcpApiKeyExists] = useState(false);
  const [mcpApiKeyMasked, setMcpApiKeyMasked] = useState<string | null>(null);
  const [mcpApiKeyRevealed, setMcpApiKeyRevealed] = useState<string | null>(
    null,
  );
  const [mcpApiKeyLoading, setMcpApiKeyLoading] = useState(false);
  const [mcpApiKeyCopied, setMcpApiKeyCopied] = useState(false);

  // Google OAuth設定
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [googleOAuthLoading, setGoogleOAuthLoading] = useState(false);

  // GitHub OAuth設定
  const [gitHubOAuthEnabled, setGitHubOAuthEnabled] = useState(false);
  const [gitHubOAuthLoading, setGitHubOAuthLoading] = useState(false);

  // アナウンスの状態
  interface Announcement {
    id: string;
    title: string;
    titleJa: string | null;
    message: string;
    messageJa: string | null;
    level: string;
    isActive: boolean;
    startAt: string;
    endAt: string | null;
    createdAt: string;
    creator: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});

  // AI設定の状態
  interface AIConfig {
    enabled: boolean;
    provider: "openai" | "anthropic" | "local";
    apiKey: string | null;
    hasApiKey: boolean;
    model: string;
    // ローカルLLM設定
    localProvider: "llama.cpp" | "lm-studio" | "ollama";
    localEndpoint: string;
    localModel: string;
  }

  interface LocalLLMDefaults {
    [key: string]: { endpoint: string; model: string };
  }

  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [aiApiKeyInput, setAiApiKeyInput] = useState("");
  const [localLLMDefaults, setLocalLLMDefaults] =
    useState<LocalLLMDefaults | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [authSettingsOpen, setAuthSettingsOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  // アナウンス用AI翻訳
  const [aiTranslationAvailable, setAiTranslationAvailable] = useState(false);
  const [useAiTranslation, setUseAiTranslation] = useState(false);
  const [aiTranslating, setAiTranslating] = useState(false);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // datetime-local入力用にローカル時刻をフォーマット (YYYY-MM-DDTHH:MM)
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Google OAuth設定を取得
  const fetchGoogleOAuthSetting = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/google-oauth");
      if (response.ok) {
        const data = await response.json();
        setGoogleOAuthEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Error fetching Google OAuth setting:", error);
    }
  }, []);

  // Google OAuth設定を切り替え
  const handleGoogleOAuthToggle = useCallback(async (enabled: boolean) => {
    setGoogleOAuthLoading(true);
    try {
      const response = await fetch("/api/admin/google-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) {
        setGoogleOAuthEnabled(enabled);
      }
    } catch (error) {
      console.error("Error updating Google OAuth setting:", error);
    } finally {
      setGoogleOAuthLoading(false);
    }
  }, []);

  // GitHub OAuth設定を取得
  const fetchGitHubOAuthSetting = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/github-oauth");
      if (response.ok) {
        const data = await response.json();
        setGitHubOAuthEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Error fetching GitHub OAuth setting:", error);
    }
  }, []);

  // GitHub OAuth設定を切り替え
  const handleGitHubOAuthToggle = useCallback(async (enabled: boolean) => {
    setGitHubOAuthLoading(true);
    try {
      const response = await fetch("/api/admin/github-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) {
        setGitHubOAuthEnabled(enabled);
      }
    } catch (error) {
      console.error("Error updating GitHub OAuth setting:", error);
    } finally {
      setGitHubOAuthLoading(false);
    }
  }, []);

  // システムタブが表示された時にOAuth設定を取得
  useEffect(() => {
    if (activeTab === "system") {
      fetchGoogleOAuthSetting();
      fetchGitHubOAuthSetting();
    }
  }, [activeTab, fetchGoogleOAuthSetting, fetchGitHubOAuthSetting]);

  // アナウンスを取得
  const fetchAnnouncements = useCallback(async () => {
    if (activeTab !== "announcements") return;

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
  }, [activeTab]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

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

    // AI翻訳の利用可否をチェック
    try {
      const response = await fetch("/api/ai/translate");
      if (response.ok) {
        const data = await response.json();
        setAiTranslationAvailable(data.available);
        if (data.available) {
          setUseAiTranslation(true); // デフォルトでON
        }
      }
    } catch {
      setAiTranslationAvailable(false);
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
    try {
      const response = await fetch("/api/ai/translate");
      if (response.ok) {
        const data = await response.json();
        setAiTranslationAvailable(data.available);
        if (data.available) setUseAiTranslation(true);
      }
    } catch {
      setAiTranslationAvailable(false);
    }
  };

  // プレースホルダー値変更ハンドラ
  const handlePlaceholderChange = (key: string, value: string) => {
    const template = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;
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

    // AI翻訳の利用可否をチェック
    try {
      const response = await fetch("/api/ai/translate");
      if (response.ok) {
        const data = await response.json();
        setAiTranslationAvailable(data.available);
      }
    } catch {
      setAiTranslationAvailable(false);
    }
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
          ...(!editingAnnouncement && { notifyUsers: announcementForm.notifyUsers }),
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

  // AI設定を取得
  const fetchAiConfig = useCallback(async () => {
    if (activeTab !== "system") return;

    try {
      setAiConfigLoading(true);
      const response = await fetch("/api/admin/ai");
      if (!response.ok) {
        throw new Error("Failed to fetch AI config");
      }

      const data = await response.json();
      setAiConfig(data.config);
      if (data.localLLMDefaults) {
        setLocalLLMDefaults(data.localLLMDefaults);
      }
    } catch (error) {
      console.error("Error fetching AI config:", error);
    } finally {
      setAiConfigLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAiConfig();
  }, [fetchAiConfig]);

  // AI設定を更新
  const handleUpdateAiConfig = async (
    updates: Partial<AIConfig & { apiKey?: string }>,
  ) => {
    try {
      setAiSaving(true);
      const response = await fetch("/api/admin/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update AI config");
      }

      const data = await response.json();
      setAiConfig(data.config);
      setAiApiKeyInput("");
      setConnectionTestResult(null);
    } catch (error) {
      console.error("Error updating AI config:", error);
      alert(t("Failed to update AI settings", "AI設定の更新に失敗しました"));
    } finally {
      setAiSaving(false);
    }
  };

  // ローカルLLM接続テスト
  const handleTestLocalConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionTestResult(null);

      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-connection" }),
      });

      const result = await response.json();
      setConnectionTestResult(result);
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionTestResult({
        success: false,
        message: t("Connection test failed", "接続テストに失敗しました"),
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // メニュー順序を更新
  const handleUpdateMenuOrder = useCallback(
    async (menuId: string, order: number) => {
      try {
        const response = await fetch("/api/admin/modules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menuId, order }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update menu order");
        }

        // ローカルの状態を更新
        setModulesData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            modules: prev.modules.map((m) => ({
              ...m,
              menus: m.menus.map((menu) =>
                menu.id === menuId ? { ...menu, order } : menu,
              ),
            })),
          };
        });

        // 選択中のモジュールも更新
        setSelectedModule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            menus: prev.menus.map((menu) =>
              menu.id === menuId ? { ...menu, order } : menu,
            ),
          };
        });
      } catch (error) {
        console.error("Error updating menu order:", error);
        alert(
          t(
            error instanceof Error
              ? error.message
              : "Failed to update menu order",
            error instanceof Error
              ? error.message
              : "メニュー順序の更新に失敗しました",
          ),
        );
      }
    },
    [t],
  );

  // モジュールの有効/無効を切り替え
  const handleToggleModule = useCallback(
    async (moduleId: string, enabled: boolean) => {
      try {
        const response = await fetch("/api/admin/modules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId, enabled }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update module");
        }

        // ローカルの状態を更新
        setModulesData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            modules: prev.modules.map((m) =>
              m.id === moduleId ? { ...m, enabled } : m,
            ),
            statistics: {
              ...prev.statistics,
              enabled: enabled
                ? prev.statistics.enabled + 1
                : prev.statistics.enabled - 1,
              disabled: enabled
                ? prev.statistics.disabled - 1
                : prev.statistics.disabled + 1,
            },
          };
        });
      } catch (error) {
        console.error("Error toggling module:", error);
        alert(
          t(
            error instanceof Error ? error.message : "Failed to update module",
            error instanceof Error
              ? error.message
              : "モジュールの更新に失敗しました",
          ),
        );
      }
    },
    [t],
  );

  // メニューの有効/無効を切り替え
  const handleToggleMenu = useCallback(
    async (menuId: string, enabled: boolean) => {
      try {
        const response = await fetch("/api/admin/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menuId, enabled }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update menu");
        }

        // ローカルの状態を更新
        setModulesData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            modules: prev.modules.map((m) => ({
              ...m,
              menus: m.menus.map((menu) =>
                menu.id === menuId ? { ...menu, enabled } : menu,
              ),
              menuCount: m.menus.filter((menu) =>
                menu.id === menuId ? enabled : menu.enabled,
              ).length,
            })),
          };
        });

        // 選択中のモジュールも更新
        setSelectedModule((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            menus: prev.menus.map((menu) =>
              menu.id === menuId ? { ...menu, enabled } : menu,
            ),
            menuCount: prev.menus.filter((menu) =>
              menu.id === menuId ? enabled : menu.enabled,
            ).length,
          };
        });
      } catch (error) {
        console.error("Error toggling menu:", error);
        alert(
          t(
            error instanceof Error ? error.message : "Failed to update menu",
            error instanceof Error
              ? error.message
              : "メニューの更新に失敗しました",
          ),
        );
      }
    },
    [t],
  );

  // モジュールデータを取得
  const fetchModules = useCallback(async () => {
    if (activeTab !== "modules") return;

    try {
      setModulesLoading(true);
      const response = await fetch("/api/admin/modules");
      if (!response.ok) {
        throw new Error("Failed to fetch modules");
      }
      const data: ModulesData = await response.json();
      setModulesData(data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    } finally {
      setModulesLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // MCPサーバAPIキー取得
  const fetchMcpApiKey = useCallback(
    async (mcpServerId: string) => {
      try {
        setMcpApiKeyLoading(true);
        // mcpServerIdからモジュール名を抽出（"organization-mcp" → "organization"）
        const moduleName = mcpServerId.replace(/-mcp$/, "");
        const response = await fetch(`/api/admin/mcp/${moduleName}`);
        if (!response.ok) return;
        const data = await response.json();
        setMcpApiKeyExists(data.exists);
        setMcpApiKeyMasked(data.maskedKey);
        setMcpApiKeyRevealed(null);
      } catch (error) {
        console.error("Error fetching MCP API key:", error);
      } finally {
        setMcpApiKeyLoading(false);
      }
    },
    [],
  );

  // MCPサーバAPIキー生成
  const generateMcpApiKey = useCallback(
    async (mcpServerId: string) => {
      try {
        setMcpApiKeyLoading(true);
        const moduleName = mcpServerId.replace(/-mcp$/, "");
        const response = await fetch(`/api/admin/mcp/${moduleName}`, {
          method: "POST",
        });
        if (!response.ok) throw new Error("Failed to generate API key");
        const data = await response.json();
        setMcpApiKeyExists(true);
        setMcpApiKeyRevealed(data.key);
        setMcpApiKeyMasked(null);
      } catch (error) {
        console.error("Error generating MCP API key:", error);
      } finally {
        setMcpApiKeyLoading(false);
      }
    },
    [],
  );

  // MCPサーバAPIキー削除
  const deleteMcpApiKey = useCallback(
    async (mcpServerId: string) => {
      try {
        setMcpApiKeyLoading(true);
        const moduleName = mcpServerId.replace(/-mcp$/, "");
        const response = await fetch(`/api/admin/mcp/${moduleName}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete API key");
        setMcpApiKeyExists(false);
        setMcpApiKeyMasked(null);
        setMcpApiKeyRevealed(null);
      } catch (error) {
        console.error("Error deleting MCP API key:", error);
      } finally {
        setMcpApiKeyLoading(false);
      }
    },
    [],
  );

  // ユーザデータを取得
  const fetchUsers = useCallback(async () => {
    if (activeTab !== "users") return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter !== "ALL" && { role: roleFilter }),
        ...(passwordStatusFilter !== "ALL" && { passwordStatus: passwordStatusFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data: PaginatedUsers = await response.json();
      setPaginatedUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, searchQuery, roleFilter, passwordStatusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ページ変更ハンドラ
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // 検索ハンドラ
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1); // 検索時は1ページ目に戻る
    fetchUsers();
  };

  // ソートハンドラ
  const handleSort = (column: "name" | "email" | "role" | "createdAt") => {
    if (sortBy === column) {
      // 同じカラムをクリックした場合は昇順/降順を切り替え
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // 別のカラムをクリックした場合は降順から開始
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // ページサイズ変更ハンドラ
  const _handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // 削除確認モーダルを開く
  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // 削除確認モーダルを閉じる
  const closeDeleteModal = () => {
    setUserToDelete(null);
    setShowDeleteModal(false);
  };

  // パスワードリセット処理
  const handleResetPassword = useCallback(async () => {
    if (!userToReset) return;

    try {
      setResettingPassword(true);
      const response = await fetch(
        `/api/admin/users/${userToReset.id}/reset-password`,
        { method: "POST" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.errorJa || data.error || "Failed to reset password",
        );
      }

      setTemporaryPassword(data.temporaryPassword);
      setShowResetPasswordConfirm(false);
      setShowResetPasswordResult(true);
    } catch (error) {
      console.error("Error resetting password:", error);
      alert(
        t(
          error instanceof Error ? error.message : "Failed to reset password",
          error instanceof Error
            ? error.message
            : "パスワードのリセットに失敗しました",
        ),
      );
      setShowResetPasswordConfirm(false);
    } finally {
      setResettingPassword(false);
    }
  }, [userToReset, t]);

  // ユーザ削除処理
  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      // 削除成功
      closeDeleteModal();
      // ユーザリストを再取得
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(
        t(
          error instanceof Error ? error.message : "Failed to delete user",
          error instanceof Error ? error.message : "ユーザの削除に失敗しました",
        ),
      );
    } finally {
      setDeleting(false);
    }
  }, [
    userToDelete,
    fetchUsers,
    t, // 削除成功
    closeDeleteModal,
  ]);

  // 組織一覧を取得
  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/organization");
      const data = await res.json();
      if (res.ok && data.organizations) {
        setOrganizations(
          data.organizations.map((org: { id: string; name: string; departments: { id: string; name: string }[] }) => ({
            id: org.id,
            name: org.name,
            departments: org.departments.map((d: { id: string; name: string }) => ({
              id: d.id,
              name: d.name,
            })),
          })),
        );
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  }, []);

  // 候補社員を取得
  const fetchCandidates = useCallback(
    async (orgId: string) => {
      if (!orgId) {
        setCandidates([]);
        return;
      }
      setCandidatesLoading(true);
      try {
        const params = new URLSearchParams({ organizationId: orgId });
        if (candidateSearch) params.set("search", candidateSearch);
        if (candidateDeptFilter && candidateDeptFilter !== "ALL")
          params.set("departmentId", candidateDeptFilter);
        const res = await fetch(`/api/admin/users/candidates?${params}`);
        const data = await res.json();
        if (res.ok) {
          setCandidates(data.candidates || []);
        }
      } catch (error) {
        console.error("Error fetching candidates:", error);
      } finally {
        setCandidatesLoading(false);
      }
    },
    [candidateSearch, candidateDeptFilter],
  );

  // 社員からアカウント作成
  const handleCreateFromEmployees = useCallback(async () => {
    const accounts = Object.entries(selectedCandidates)
      .map(([employeeId, { role }]) => {
        const c = candidates.find((c) => c.employeeId === employeeId);
        if (!c || !c.email) return null;
        return { employeeId, email: c.email, name: c.name, role };
      })
      .filter(Boolean);

    if (accounts.length === 0) return;
    setCreatingAccounts(true);
    try {
      const res = await fetch("/api/admin/users/create-from-employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(
          data.error ||
            t("Account creation failed", "アカウント作成に失敗しました"),
        );
        return;
      }
      setCreateResult(data);
      setShowCandidateDialog(false);
      setSelectedCandidates({});
      setShowCreateResult(true);
      await fetchUsers();
    } catch (error) {
      console.error("Error creating accounts:", error);
      alert(t("Account creation failed", "アカウント作成に失敗しました"));
    } finally {
      setCreatingAccounts(false);
    }
  }, [selectedCandidates, candidates, fetchUsers, t]);

  // 退職者アカウント取得
  const fetchRetiredAccounts = useCallback(
    async (orgId: string) => {
      if (!orgId) {
        setRetiredAccounts([]);
        return;
      }
      setRetiredAccountsLoading(true);
      try {
        const res = await fetch(
          `/api/admin/users/retired-accounts?organizationId=${orgId}`,
        );
        const data = await res.json();
        if (res.ok) {
          setRetiredAccounts(data.accounts || []);
        }
      } catch (error) {
        console.error("Error fetching retired accounts:", error);
      } finally {
        setRetiredAccountsLoading(false);
      }
    },
    [],
  );

  // 退職者アカウント一括削除
  const handleDeleteRetiredAccounts = useCallback(async () => {
    if (selectedRetired.size === 0) return;
    setDeletingRetired(true);
    try {
      const res = await fetch("/api/admin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedRetired) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(
          data.errorJa || data.error ||
            t("Deletion failed", "削除に失敗しました"),
        );
        return;
      }
      setShowRetiredDeleteConfirm(false);
      setShowCandidateDialog(false);
      setSelectedRetired(new Set());
      setRetiredAccounts([]);
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting retired accounts:", error);
      alert(t("Deletion failed", "削除に失敗しました"));
    } finally {
      setDeletingRetired(false);
      setShowRetiredDeleteConfirm(false);
    }
  }, [selectedRetired, fetchUsers, t]);

  // 作成結果CSVダウンロード
  const handleCreateResultCsvDownload = useCallback(() => {
    if (!createResult?.created.length) return;
    const bom = "\uFEFF";
    const header = `${t("Name", "名前")},${t("Email", "メールアドレス")},${t("Role", "ロール")},${t("Temporary Password", "仮パスワード")}`;
    const rows = createResult.created.map(
      (a) => `${a.name},${a.email},${a.role},${a.temporaryPassword}`,
    );
    const csv = bom + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "created-accounts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [createResult, t]);

  // ヘッダーの高さを計算（タブがある場合は高くなる）
  // ヘッダー本体: 約72px + タブナビ: 約44px = 約116px ≈ 7.25rem
  const headerHeight = "7.25rem";

  return (
    <div
      className="fixed inset-0 flex flex-col bg-muted/30 transition-all duration-300"
      style={{
        top: headerHeight,
        left: open ? `${width}px` : "4rem",
      }}
    >
      <div className={`flex-1 ${["users", "access-keys", "announcements"].includes(activeTab) ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`max-w-7xl mx-auto p-6 ${["users", "access-keys", "announcements"].includes(activeTab) ? "h-full flex flex-col" : "space-y-6"}`}>
          {/* システム情報タブ */}
          {activeTab === "system" && (
            <Card>
              <CardContent className="p-8">
                {/* システム情報 */}
                <div className="space-y-4">
                  <h2 className="text-base font-semibold">
                    {t("System Information", "システム情報")}
                  </h2>

                  <div className="p-6 bg-muted rounded-lg">
                    <div className="space-y-3 text-muted-foreground">
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="font-medium">
                          {t("Framework", "フレームワーク")}
                        </span>
                        <span>Next.js 15 (App Router)</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="font-medium">
                          {t("Database", "データベース")}
                        </span>
                        <span>PostgreSQL (Prisma ORM)</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="font-medium">
                          {t("Authentication", "認証")}
                        </span>
                        <span>Auth.js (NextAuth.js v5)</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="font-medium">
                          {t("Auth Providers", "認証プロバイダ")}
                        </span>
                        <span>Google OAuth / GitHub OAuth</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="font-medium">
                          {t("Styling", "スタイリング")}
                        </span>
                        <span>Tailwind CSS 4</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium">
                          {t("Language", "言語")}
                        </span>
                        <span>TypeScript</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 認証設定 */}
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => setAuthSettingsOpen(!authSettingsOpen)}
                    className="flex items-center gap-2 w-full text-left cursor-pointer"
                  >
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${authSettingsOpen ? "" : "-rotate-90"}`}
                    />
                    <h2 className="text-base font-semibold">
                      {t("Authentication Settings", "認証設定")}
                    </h2>
                  </button>

                  {authSettingsOpen && (
                    <div className="space-y-4 mt-4">
                      <div className="p-6 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground">
                              Google OAuth
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t(
                                "Enable Google OAuth login on the login page",
                                "ログイン画面でGoogle OAuthログインを有効にする",
                              )}
                            </p>
                          </div>
                          <Switch
                            checked={googleOAuthEnabled}
                            onCheckedChange={handleGoogleOAuthToggle}
                            disabled={googleOAuthLoading}
                          />
                        </div>
                        {!googleOAuthEnabled && (
                          <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                            {t(
                              "To enable Google OAuth, configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables.",
                              "Google OAuthを有効にするには、環境変数にGOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを設定してください。",
                            )}
                          </p>
                        )}
                      </div>

                      {/* GitHub OAuth */}
                      <div className="p-6 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground">
                              GitHub OAuth
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t(
                                "Enable GitHub OAuth login on the login page",
                                "ログイン画面でGitHub OAuthログインを有効にする",
                              )}
                            </p>
                          </div>
                          <Switch
                            checked={gitHubOAuthEnabled}
                            onCheckedChange={handleGitHubOAuthToggle}
                            disabled={gitHubOAuthLoading}
                          />
                        </div>
                        {!gitHubOAuthEnabled && (
                          <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                            {t(
                              "To enable GitHub OAuth, configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the environment variables.",
                              "GitHub OAuthを有効にするには、環境変数にGITHUB_CLIENT_IDとGITHUB_CLIENT_SECRETを設定してください。",
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI設定 */}
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => setAiSettingsOpen(!aiSettingsOpen)}
                    className="flex items-center gap-2 w-full text-left cursor-pointer"
                  >
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${aiSettingsOpen ? "" : "-rotate-90"}`}
                    />
                    <h2 className="text-base font-semibold">
                      {t("AI Settings", "AI設定")}
                    </h2>
                  </button>

                  {aiSettingsOpen && (
                    <>
                      {aiConfigLoading && (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("Loading...", "読み込み中...")}
                          </p>
                        </div>
                      )}

                      {!aiConfigLoading && aiConfig && (
                        <div className="space-y-4 mt-4">
                      {/* 有効/無効 */}
                      <div className="p-6 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground">
                              {t("Enable AI Features", "AI機能を有効化")}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t(
                                "Enable AI-powered features like translation.",
                                "翻訳などのAI機能を有効にします。",
                              )}
                            </p>
                          </div>
                          <Switch
                            checked={aiConfig.enabled}
                            onCheckedChange={(checked) =>
                              handleUpdateAiConfig({ enabled: checked })
                            }
                            disabled={aiSaving}
                          />
                        </div>
                      </div>

                      {/* プロバイダ選択 */}
                      <div className="p-6 bg-muted rounded-lg space-y-4">
                        <div className="space-y-2">
                          <Label>{t("AI Provider", "AIプロバイダ")}</Label>
                          <Select
                            value={aiConfig.provider}
                            onValueChange={(value) =>
                              handleUpdateAiConfig({
                                provider: value as
                                  | "openai"
                                  | "anthropic"
                                  | "local",
                              })
                            }
                            disabled={aiSaving}
                          >
                            <SelectTrigger className="w-full md:w-[300px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">
                                {t("Local LLM", "ローカルLLM")} (
                                {t("Recommended", "推奨")})
                              </SelectItem>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">
                                Anthropic (Claude)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {aiConfig.provider === "local" &&
                              t(
                                "Uses a local LLM server. No API key required.",
                                "ローカルLLMサーバを使用します。APIキー不要です。",
                              )}
                            {aiConfig.provider === "openai" &&
                              t(
                                "Uses OpenAI GPT models for AI features.",
                                "OpenAI GPTモデルを使用します。",
                              )}
                            {aiConfig.provider === "anthropic" &&
                              t(
                                "Uses Anthropic Claude models for AI features.",
                                "Anthropic Claudeモデルを使用します。",
                              )}
                          </p>
                        </div>

                        {/* ローカルLLM設定 */}
                        {aiConfig.provider === "local" && (
                          <>
                            {/* ローカルプロバイダ選択 */}
                            <div className="space-y-2">
                              <Label>
                                {t("Local LLM Server", "ローカルLLMサーバ")}
                              </Label>
                              <Select
                                value={aiConfig.localProvider}
                                onValueChange={(value) => {
                                  const provider = value as
                                    | "llama.cpp"
                                    | "lm-studio"
                                    | "ollama";
                                  const defaults = localLLMDefaults?.[provider];
                                  handleUpdateAiConfig({
                                    localProvider: provider,
                                    localEndpoint: defaults?.endpoint || "",
                                    localModel: defaults?.model || "",
                                  });
                                }}
                                disabled={aiSaving}
                              >
                                <SelectTrigger className="w-full md:w-[300px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="llama.cpp">
                                    llama.cpp ({t("Default", "デフォルト")})
                                  </SelectItem>
                                  <SelectItem value="lm-studio">
                                    LM Studio
                                  </SelectItem>
                                  <SelectItem value="ollama">Ollama</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* エンドポイントURL */}
                            <div className="space-y-2">
                              <Label>
                                {t("Endpoint URL", "エンドポイントURL")}
                              </Label>
                              <Input
                                value={aiConfig.localEndpoint}
                                onChange={(e) =>
                                  handleUpdateAiConfig({
                                    localEndpoint: e.target.value,
                                  })
                                }
                                placeholder={
                                  localLLMDefaults?.[aiConfig.localProvider]
                                    ?.endpoint || ""
                                }
                                className="font-mono"
                                disabled={aiSaving}
                              />
                              <p className="text-xs text-muted-foreground">
                                {aiConfig.localProvider === "llama.cpp" &&
                                  t(
                                    "Default: http://localhost:8080/v1/chat/completions",
                                    "デフォルト: http://localhost:8080/v1/chat/completions",
                                  )}
                                {aiConfig.localProvider === "lm-studio" &&
                                  t(
                                    "Default: http://localhost:1234/v1/chat/completions",
                                    "デフォルト: http://localhost:1234/v1/chat/completions",
                                  )}
                                {aiConfig.localProvider === "ollama" &&
                                  t(
                                    "Default: http://localhost:11434/api/chat",
                                    "デフォルト: http://localhost:11434/api/chat",
                                  )}
                              </p>
                            </div>

                            {/* モデル名 */}
                            <div className="space-y-2">
                              <Label>{t("Model Name", "モデル名")}</Label>
                              <Input
                                value={aiConfig.localModel}
                                onChange={(e) =>
                                  handleUpdateAiConfig({
                                    localModel: e.target.value,
                                  })
                                }
                                placeholder={
                                  localLLMDefaults?.[aiConfig.localProvider]
                                    ?.model || "default"
                                }
                                disabled={aiSaving}
                              />
                              <p className="text-xs text-muted-foreground">
                                {aiConfig.localProvider === "ollama"
                                  ? t(
                                      "e.g., llama3.2, gemma2, mistral",
                                      "例: llama3.2, gemma2, mistral",
                                    )
                                  : t(
                                      "Leave as 'default' to use the loaded model",
                                      "ロード済みモデルを使用する場合は 'default' のまま",
                                    )}
                              </p>
                            </div>

                            {/* 接続テスト */}
                            <div className="flex items-center gap-4">
                              <Button
                                variant="outline"
                                onClick={handleTestLocalConnection}
                                disabled={testingConnection || aiSaving}
                              >
                                {testingConnection
                                  ? t("Testing...", "テスト中...")
                                  : t("Test Connection", "接続テスト")}
                              </Button>
                              {connectionTestResult && (
                                <span
                                  className={`text-sm ${connectionTestResult.success ? "text-green-600" : "text-red-600"}`}
                                >
                                  {connectionTestResult.success ? "✓ " : "✗ "}
                                  {connectionTestResult.message}
                                </span>
                              )}
                            </div>
                          </>
                        )}

                        {/* クラウドAPI設定 */}
                        {aiConfig.provider !== "local" && (
                          <>
                            {/* モデル選択 */}
                            <div className="space-y-2">
                              <Label>{t("Model", "モデル")}</Label>
                              <Select
                                value={aiConfig.model}
                                onValueChange={(value) =>
                                  handleUpdateAiConfig({ model: value })
                                }
                                disabled={aiSaving}
                              >
                                <SelectTrigger className="w-full md:w-[300px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {aiConfig.provider === "openai" && (
                                    <>
                                      <SelectItem value="gpt-4o-mini">
                                        GPT-4o mini ({t("Recommended", "推奨")})
                                      </SelectItem>
                                      <SelectItem value="gpt-4o">
                                        GPT-4o
                                      </SelectItem>
                                      <SelectItem value="gpt-4-turbo">
                                        GPT-4 Turbo
                                      </SelectItem>
                                    </>
                                  )}
                                  {aiConfig.provider === "anthropic" && (
                                    <>
                                      <SelectItem value="claude-3-haiku-20240307">
                                        Claude 3 Haiku (
                                        {t("Recommended", "推奨")})
                                      </SelectItem>
                                      <SelectItem value="claude-3-5-sonnet-20241022">
                                        Claude 3.5 Sonnet
                                      </SelectItem>
                                      <SelectItem value="claude-3-opus-20240229">
                                        Claude 3 Opus
                                      </SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* APIキー */}
                            <div className="space-y-2">
                              <Label>{t("API Key", "APIキー")}</Label>
                              {aiConfig.hasApiKey ? (
                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <Input
                                      value={aiConfig.apiKey || ""}
                                      disabled
                                      className="font-mono"
                                    />
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      handleUpdateAiConfig({ apiKey: "" })
                                    }
                                    disabled={aiSaving}
                                  >
                                    {t("Remove", "削除")}
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <Input
                                      type="password"
                                      value={aiApiKeyInput}
                                      onChange={(e) =>
                                        setAiApiKeyInput(e.target.value)
                                      }
                                      placeholder={
                                        aiConfig.provider === "openai"
                                          ? "sk-..."
                                          : aiConfig.provider === "anthropic"
                                            ? "sk-ant-..."
                                            : ""
                                      }
                                      className="font-mono"
                                    />
                                  </div>
                                  <Button
                                    onClick={() =>
                                      handleUpdateAiConfig({
                                        apiKey: aiApiKeyInput,
                                      })
                                    }
                                    disabled={aiSaving || !aiApiKeyInput}
                                  >
                                    {aiSaving
                                      ? t("Saving...", "保存中...")
                                      : t("Save", "保存")}
                                  </Button>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {aiConfig.provider === "openai" && (
                                  <>
                                    {t("Get your API key from ", "APIキーは ")}
                                    <a
                                      href="https://platform.openai.com/api-keys"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      OpenAI Platform
                                    </a>
                                    {t(
                                      " to use AI features.",
                                      " から取得できます。",
                                    )}
                                  </>
                                )}
                                {aiConfig.provider === "anthropic" && (
                                  <>
                                    {t("Get your API key from ", "APIキーは ")}
                                    <a
                                      href="https://console.anthropic.com/settings/keys"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      Anthropic Console
                                    </a>
                                    {t(
                                      " to use AI features.",
                                      " から取得できます。",
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* ステータス */}
                      <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              aiConfig.enabled &&
                              (
                                aiConfig.provider === "local"
                                  ? !!aiConfig.localEndpoint
                                  : aiConfig.hasApiKey
                              )
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />
                          <span className="font-medium">
                            {aiConfig.enabled &&
                            (aiConfig.provider === "local"
                              ? !!aiConfig.localEndpoint
                              : aiConfig.hasApiKey)
                              ? t(
                                  "AI features are ready to use",
                                  "AI機能が利用可能です",
                                )
                              : !aiConfig.enabled
                                ? t(
                                    "AI features are disabled",
                                    "AI機能が無効です",
                                  )
                                : aiConfig.provider === "local"
                                  ? t(
                                      "Endpoint is not configured",
                                      "エンドポイントが設定されていません",
                                    )
                                  : t(
                                      "API key is not configured",
                                      "APIキーが設定されていません",
                                    )}
                          </span>
                        </div>
                      </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* アカウント管理タブ */}
          {activeTab === "users" && (
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="p-6 flex-1 flex flex-col min-h-0">
                {/* ツールバー：検索・フィルター */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <form
                    onSubmit={handleSearch}
                    className="flex gap-2 w-full sm:w-auto"
                  >
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={t(
                          "Search by name or email...",
                          "名前またはメールで検索...",
                        )}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-72"
                      />
                    </div>
                    <Button type="submit" variant="secondary">
                      {t("Search", "検索")}
                    </Button>
                  </form>
                  <div className="flex items-center gap-2">
                    <Select
                      value={roleFilter}
                      onValueChange={(value) => {
                        setRoleFilter(value);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue
                          placeholder={t("All Roles", "すべてのロール")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">
                          {t("All Roles", "すべてのロール")}
                        </SelectItem>
                        <SelectItem value="ADMIN">
                          {t("Admin", "管理者")}
                        </SelectItem>
                        <SelectItem value="EXECUTIVE">
                          {t("Executive", "役員")}
                        </SelectItem>
                        <SelectItem value="MANAGER">
                          {t("Manager", "マネージャー")}
                        </SelectItem>
                        <SelectItem value="USER">
                          {t("User", "ユーザ")}
                        </SelectItem>
                        <SelectItem value="GUEST">
                          {t("Guest", "ゲスト")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={passwordStatusFilter}
                      onValueChange={(value) => {
                        setPasswordStatusFilter(value);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue
                          placeholder={t("Password Status", "パスワード状態")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">
                          {t("All Accounts", "すべてのアカウント")}
                        </SelectItem>
                        <SelectItem value="tempPassword">
                          {t("Temp Password", "仮パスワード")}
                        </SelectItem>
                        <SelectItem value="expired">
                          {t("Expired", "期限切れ")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              fetchOrganizations();
                              setCandidateOrgId("");
                              setCandidateSearch("");
                              setCandidateDeptFilter("ALL");
                              setCandidates([]);
                              setSelectedCandidates({});
                              setShowCandidateDialog(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t(
                            "Create from Employees",
                            "社員からアカウント作成",
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* ローディング */}
                {loading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">
                      {t("Loading...", "読み込み中...")}
                    </p>
                  </div>
                )}

                {/* ユーザテーブル */}
                {!loading && paginatedUsers.length > 0 && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* ページネーション（テーブル上部） */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        {t("Total", "合計")}:{" "}
                        <span className="font-medium text-foreground">
                          {total}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t("Previous", "前へ")}
                        </Button>
                        <div className="flex items-center gap-1 px-2">
                          <span className="text-sm font-medium">{page}</span>
                          <span className="text-sm text-muted-foreground">
                            /
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {totalPages || 1}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page >= totalPages}
                          className="gap-1"
                        >
                          {t("Next", "次へ")}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* テーブルコンテナ */}
                    <div className="rounded-lg border overflow-hidden flex-1 flex flex-col min-h-0">
                      <div className="overflow-y-auto flex-1">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/50 z-10">
                            <TableRow>
                              <TableHead className="w-[250px]">
                                <button
                                  onClick={() => handleSort("name")}
                                  className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                                >
                                  {t("User", "ユーザ")}
                                  {sortBy === "name" && (
                                    <span className="text-primary">
                                      {sortOrder === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </button>
                              </TableHead>
                              <TableHead className="w-[150px]">
                                <button
                                  onClick={() => handleSort("role")}
                                  className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                                >
                                  {t("Role", "ロール")}
                                  {sortBy === "role" && (
                                    <span className="text-primary">
                                      {sortOrder === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </button>
                              </TableHead>
                              <TableHead className="w-[180px]">
                                <button
                                  onClick={() => handleSort("createdAt")}
                                  className="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
                                >
                                  {t("Login / Created", "ログイン / 作成日")}
                                  {sortBy === "createdAt" && (
                                    <span className="text-primary">
                                      {sortOrder === "asc" ? "↑" : "↓"}
                                    </span>
                                  )}
                                </button>
                              </TableHead>
                              <TableHead className="w-[80px] text-right">
                                {t("Actions", "操作")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    {user.image ? (
                                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                        <Image
                                          src={user.image}
                                          alt={user.name || "User"}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                        <span className="text-muted-foreground text-sm font-semibold">
                                          {user.name?.[0]?.toUpperCase() || "?"}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {user.name}
                                        </span>
                                        {user.forcePasswordChange && (
                                          user.passwordExpiresAt && new Date(user.passwordExpiresAt) <= new Date() ? (
                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                              {t("Expired", "期限切れ")}
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                              {t("Temp Password", "仮パスワード")}
                                            </Badge>
                                          )
                                        )}
                                      </div>
                                      <span className="text-sm text-muted-foreground">
                                        {user.email}
                                      </span>
                                      {user.forcePasswordChange && user.passwordExpiresAt && (
                                        <span className={`text-[11px] ${new Date(user.passwordExpiresAt) > new Date() ? "text-muted-foreground" : "text-destructive"}`}>
                                          {t("Expires: ", "期限: ")}
                                          {new Date(user.passwordExpiresAt).toLocaleString(
                                            language === "ja" ? "ja-JP" : "en-US",
                                            { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <UserRoleChanger
                                    userId={user.id}
                                    currentRole={user.role}
                                    isCurrentUser={user.id === currentUserId}
                                    language={language}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {user.lastSignInAt
                                        ? new Date(
                                            user.lastSignInAt,
                                          ).toLocaleDateString(
                                            language === "ja"
                                              ? "ja-JP"
                                              : "en-US",
                                            {
                                              year: "numeric",
                                              month:
                                                language === "ja"
                                                  ? "long"
                                                  : "short",
                                              day: "numeric",
                                            },
                                          )
                                        : t("Never", "未ログイン")}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {t("Created", "作成")}:{" "}
                                      {new Date(
                                        user.createdAt,
                                      ).toLocaleDateString(
                                        language === "ja" ? "ja-JP" : "en-US",
                                        {
                                          year: "numeric",
                                          month:
                                            language === "ja"
                                              ? "long"
                                              : "short",
                                          day: "numeric",
                                        },
                                      )}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {user.id !== currentUserId ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                              onClick={() => {
                                                setUserToReset(user);
                                                setShowResetPasswordConfirm(true);
                                              }}
                                            >
                                              <RefreshCw className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>
                                              {t(
                                                "Reset Password",
                                                "パスワードリセット",
                                              )}
                                            </p>
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
                                              onClick={() =>
                                                openDeleteModal(user)
                                              }
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
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      {t("(You)", "(自分)")}
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

                {/* データなし */}
                {!loading && paginatedUsers.length === 0 && (
                  <EmptyState
                    message={t("No users found", "ユーザが見つかりません")}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* アクセスキー管理タブ */}
          {activeTab === "access-keys" && (
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="p-8 flex-1 flex flex-col min-h-0">
                <AccessKeyManager
                  accessKeys={accessKeys}
                  users={users}
                  menus={menus}
                  modules={modules}
                  adminId={currentUserId}
                  language={language}
                />
              </CardContent>
            </Card>
          )}

          {/* モジュール管理タブ */}
          {activeTab === "modules" && (
            <Card className="h-full flex flex-col">
              {/* モジュール一覧画面 */}
              {!selectedModule && (
                <>
                  {/* ローディング */}
                  {modulesLoading && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                        <p className="mt-4 text-muted-foreground">
                          {t("Loading...", "読み込み中...")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* モジュール一覧 */}
                  {!modulesLoading && modulesData && (
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {modulesData.modules.map((module) => (
                          <Card
                            key={module.id}
                            className={`hover:shadow-md transition-all ${
                              !module.enabled && "opacity-70 hover:opacity-100"
                            }`}
                          >
                            <CardHeader className="pb-3">
                              {/* トグルスイッチ */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={module.enabled}
                                    onCheckedChange={(checked) =>
                                      handleToggleModule(module.id, checked)
                                    }
                                    disabled={module.type === "core"}
                                  />
                                  <span
                                    className={`text-sm font-medium ${module.enabled ? "text-green-700" : "text-muted-foreground"}`}
                                  >
                                    {module.enabled
                                      ? t("Enabled", "有効")
                                      : t("Disabled", "無効")}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    module.type === "core"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-purple-50 text-purple-700 border-purple-200"
                                  }
                                >
                                  {module.type === "core" ? "Core" : "Addon"}
                                </Badge>
                              </div>

                              {/* モジュールヘッダー */}
                              <div
                                className="cursor-pointer"
                                onClick={() => { setSelectedModule(module); setMcpPanelOpen(false); }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                                    {getModuleIcon(module.id, "w-5 h-5")}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">
                                      {language === "ja"
                                        ? module.nameJa
                                        : module.name}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      {language === "ja"
                                        ? module.name
                                        : module.nameJa}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent
                              className="cursor-pointer"
                              onClick={() => { setSelectedModule(module); setMcpPanelOpen(false); }}
                            >
                              {/* モジュール説明 */}
                              {(language === "ja"
                                ? module.descriptionJa
                                : module.description) && (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                  {language === "ja"
                                    ? module.descriptionJa
                                    : module.description}
                                </p>
                              )}

                              {/* モジュール情報 */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {t("Menus", "メニュー数")}:
                                  </span>
                                  <span className="font-medium">
                                    {module.menuCount}
                                  </span>
                                </div>
                                {module.services?.length > 0 && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      {t("Services", "サービス数")}:
                                    </span>
                                    <span className="font-medium">
                                      {module.services.length}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* コンテナ・MCPサーバステータス（シンプル表示） */}
                              {(module.containers?.length > 0 ||
                                module.mcpServer) && (
                                <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
                                  {/* コンテナステータス */}
                                  {module.containers &&
                                    module.containers.length > 0 &&
                                    (() => {
                                      const allRunning =
                                        module.containers.every(
                                          (c) => c.isRunning,
                                        );
                                      const hasRequiredStopped =
                                        module.containers.some(
                                          (c) => !c.isRunning && c.required,
                                        );
                                      return (
                                        <div className="flex items-center gap-1.5 text-xs">
                                          <svg
                                            className="w-3.5 h-3.5 text-muted-foreground"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                                            />
                                          </svg>
                                          <span className="text-muted-foreground">
                                            {t("Container", "コンテナ")}
                                          </span>
                                          <span
                                            className={`flex items-center gap-1 ${allRunning ? "text-green-600" : "text-amber-600"}`}
                                          >
                                            <span
                                              className={`w-1.5 h-1.5 rounded-full ${allRunning ? "bg-green-500" : "bg-amber-500"}`}
                                            />
                                            {allRunning
                                              ? t("Running", "稼働中")
                                              : t("Stopped", "停止中")}
                                            {hasRequiredStopped && (
                                              <span>⚠️</span>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })()}

                                  {/* MCPサーバー */}
                                  {module.mcpServer && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <svg
                                        className="w-3.5 h-3.5 text-muted-foreground"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                      <span className="text-muted-foreground">
                                        {t("MCP", "MCP")}
                                      </span>
                                      <span className="text-blue-600">
                                        {module.mcpServer.toolCount}{" "}
                                        {t("tools", "ツール")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* モジュールID */}
                              <div className="mt-4 pt-4 border-t">
                                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  {module.id}
                                </code>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* モジュール詳細画面 */}
              {selectedModule && (
                <div className="h-full flex flex-col">
                  {/* ヘッダー */}
                  <div className="p-6 border-b flex-shrink-0 flex items-center gap-4">
                    <button
                      onClick={() => setSelectedModule(null)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <div className="flex-shrink-0 w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
                      {getModuleIcon(selectedModule.id, "w-7 h-7")}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">
                        {language === "ja"
                          ? selectedModule.nameJa
                          : selectedModule.name}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === "ja"
                          ? selectedModule.name
                          : selectedModule.nameJa}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {/* モジュール情報 */}
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          {t("Type", "タイプ")}
                        </h3>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            selectedModule.type === "core"
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {selectedModule.type === "core"
                            ? "Core Module"
                            : "Addon Module"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          {t("Status", "ステータス")}
                        </h3>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            selectedModule.enabled
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {selectedModule.enabled
                            ? t("Enabled", "有効")
                            : t("Disabled", "無効")}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          {t("Description", "説明")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {(language === "ja"
                            ? selectedModule.descriptionJa
                            : selectedModule.description) || t("None", "なし")}
                        </p>
                      </div>
                    </div>

                    {/* モジュールID */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        {t("Module ID", "モジュールID")}
                      </h3>
                      <code className="text-sm bg-muted px-3 py-2 rounded block">
                        {selectedModule.id}
                      </code>
                    </div>

                    {/* MCPサーバー詳細（折り畳み可能） */}
                    {selectedModule.mcpServer && (
                      <div className="mb-6 bg-muted border border-border rounded-lg">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !mcpPanelOpen;
                            setMcpPanelOpen(next);
                            if (next && selectedModule.mcpServer) {
                              fetchMcpApiKey(selectedModule.mcpServer.id);
                            }
                          }}
                          className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-accent/50 rounded-lg transition-colors"
                        >
                          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold">
                              {language === "ja"
                                ? selectedModule.mcpServer.nameJa
                                : selectedModule.mcpServer.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {t(
                                "MCP Server for external AI integration",
                                "外部AI連携用MCPサーバ",
                              )}
                            </p>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                              mcpPanelOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {mcpPanelOpen && (
                          <div className="px-4 pb-4 space-y-3">
                            {/* 説明 */}
                            {(language === "ja"
                              ? selectedModule.mcpServer.descriptionJa
                              : selectedModule.mcpServer.description) && (
                              <div className="p-3 bg-card rounded-lg border border-border">
                                <p className="text-sm font-medium mb-1">
                                  {t("Description", "説明")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {language === "ja"
                                    ? selectedModule.mcpServer.descriptionJa
                                    : selectedModule.mcpServer.description}
                                </p>
                              </div>
                            )}

                            {/* ツール一覧 */}
                            <div className="p-3 bg-card rounded-lg border border-border">
                              <p className="text-sm font-medium mb-2">
                                {t("Tools", "ツール")} (
                                {selectedModule.mcpServer.toolCount})
                              </p>
                              <div className="space-y-1.5">
                                {selectedModule.mcpServer.tools.map((tool) => (
                                  <div
                                    key={tool.name}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <code className="text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                                      {tool.name}
                                    </code>
                                    <span className="text-muted-foreground">
                                      {tool.descriptionJa}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* アクセスモード */}
                            <div className="p-3 bg-card rounded-lg border border-border">
                              <p className="text-sm font-medium mb-1">
                                {t("Access Mode", "アクセスモード")}
                              </p>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  selectedModule.mcpServer.readOnly
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                }`}
                              >
                                {selectedModule.mcpServer.readOnly
                                  ? t("Read Only", "読み取り専用")
                                  : t("Read/Write", "読み書き可能")}
                              </span>
                            </div>

                            {/* パス */}
                            <div className="p-3 bg-card rounded-lg border border-border">
                              <p className="text-sm font-medium mb-1">
                                {t("Server Path", "サーバパス")}
                              </p>
                              <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                                {selectedModule.mcpServer.path}
                              </code>
                            </div>

                            {/* APIキー管理 */}
                            <div className="p-3 bg-card rounded-lg border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <Key className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                  {t("API Key", "APIキー")}
                                </p>
                              </div>

                              {mcpApiKeyLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  {t("Loading...", "読み込み中...")}
                                </div>
                              ) : mcpApiKeyRevealed ? (
                                /* 生成直後: キー全文を表示 */
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded break-all select-all">
                                      {mcpApiKeyRevealed}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="shrink-0 h-8 w-8 p-0"
                                      onClick={async () => {
                                        await navigator.clipboard.writeText(
                                          mcpApiKeyRevealed,
                                        );
                                        setMcpApiKeyCopied(true);
                                        setTimeout(
                                          () => setMcpApiKeyCopied(false),
                                          2000,
                                        );
                                      }}
                                    >
                                      {mcpApiKeyCopied ? (
                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    {t(
                                      "Copy the key now. It will not be shown again.",
                                      "このキーを今すぐコピーしてください。再表示はできません。",
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 pt-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        if (selectedModule.mcpServer) {
                                          generateMcpApiKey(
                                            selectedModule.mcpServer.id,
                                          );
                                        }
                                      }}
                                      disabled={mcpApiKeyLoading}
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                      {t("Regenerate", "再生成")}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (selectedModule.mcpServer) {
                                          deleteMcpApiKey(
                                            selectedModule.mcpServer.id,
                                          );
                                        }
                                      }}
                                      disabled={mcpApiKeyLoading}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                      {t("Delete", "削除")}
                                    </Button>
                                  </div>
                                </div>
                              ) : mcpApiKeyExists ? (
                                /* 既存キー: マスク表示 */
                                <div className="space-y-2">
                                  <code className="block text-xs font-mono bg-muted px-2 py-1.5 rounded text-muted-foreground">
                                    {mcpApiKeyMasked}
                                  </code>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        if (selectedModule.mcpServer) {
                                          generateMcpApiKey(
                                            selectedModule.mcpServer.id,
                                          );
                                        }
                                      }}
                                      disabled={mcpApiKeyLoading}
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                      {t("Regenerate", "再生成")}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (selectedModule.mcpServer) {
                                          deleteMcpApiKey(
                                            selectedModule.mcpServer.id,
                                          );
                                        }
                                      }}
                                      disabled={mcpApiKeyLoading}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                      {t("Delete", "削除")}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* キー未発行 */
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    {t(
                                      "No API key has been generated. Generate one to use with the MCP server.",
                                      "APIキーが未発行です。MCPサーバの利用にはキーを発行してください。",
                                    )}
                                  </p>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (selectedModule.mcpServer) {
                                        generateMcpApiKey(
                                          selectedModule.mcpServer.id,
                                        );
                                      }
                                    }}
                                    disabled={mcpApiKeyLoading}
                                  >
                                    <Key className="w-3.5 h-3.5 mr-1.5" />
                                    {t("Generate API Key", "APIキーを発行")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* メニュー一覧 */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        {t("Menus", "メニュー")} ({selectedModule.menuCount})
                      </h3>
                      {selectedModule.menus.length > 0 ? (
                        <div className="space-y-2">
                          {selectedModule.menus
                            .sort((a, b) => a.order - b.order)
                            .map((menu) => (
                              <div
                                key={menu.id}
                                className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {language === "ja"
                                      ? menu.nameJa
                                      : menu.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {language === "ja"
                                      ? menu.name
                                      : menu.nameJa}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 mt-1">
                                    {menu.path}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* ロールバッジ */}
                                  <div className="flex gap-1">
                                    {menu.requiredRoles.map((role) => (
                                      <span
                                        key={role}
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                          role === "ADMIN"
                                            ? "bg-red-100 text-red-700"
                                            : role === "EXECUTIVE"
                                              ? "bg-rose-100 text-rose-700"
                                              : role === "MANAGER"
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {role}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                    {menu.menuGroup}
                                  </span>
                                  {/* 順序入力 */}
                                  <Input
                                    type="number"
                                    value={menu.order}
                                    onChange={(e) => {
                                      const newOrder = parseInt(
                                        e.target.value,
                                        10,
                                      );
                                      if (!Number.isNaN(newOrder)) {
                                        handleUpdateMenuOrder(
                                          menu.id,
                                          newOrder,
                                        );
                                      }
                                    }}
                                    className="w-16 h-7 text-xs text-center"
                                    min={0}
                                    max={999}
                                  />
                                  <div className="flex items-center gap-1">
                                    <Switch
                                      checked={menu.enabled}
                                      onCheckedChange={(checked) =>
                                        handleToggleMenu(menu.id, checked)
                                      }
                                      className="scale-75"
                                    />
                                    <span
                                      className={`text-xs ${menu.enabled ? "text-green-700" : "text-muted-foreground"}`}
                                    >
                                      {menu.enabled
                                        ? t("Enabled", "有効")
                                        : t("Disabled", "無効")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {t("No menus", "メニューがありません")}
                        </p>
                      )}
                    </div>

                    {/* サービス一覧（折りたたみ） */}
                    {selectedModule.services?.length > 0 && (
                      <div className="mb-6">
                        <button
                          type="button"
                          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2"
                          onClick={() =>
                            setExpandedServices((prev) => ({
                              ...prev,
                              [selectedModule.id]:
                                !prev[selectedModule.id],
                            }))
                          }
                        >
                          {expandedServices[selectedModule.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {t("Services", "サービス")} (
                          {selectedModule.services.length})
                        </button>
                        {expandedServices[selectedModule.id] && (
                          <div className="space-y-2">
                            {selectedModule.services.map((service) => (
                              <div
                                key={service.id}
                                className="p-3 bg-muted rounded-lg border border-border"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {language === "ja"
                                        ? service.nameJa
                                        : service.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {language === "ja"
                                        ? service.name
                                        : service.nameJa}
                                    </p>
                                    {(language === "ja"
                                      ? service.descriptionJa
                                      : service.description) && (
                                      <p className="text-xs text-muted-foreground/70 mt-1">
                                        {language === "ja"
                                          ? service.descriptionJa
                                          : service.description}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`text-xs ${service.enabled ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}
                                  >
                                    {service.enabled
                                      ? t("Enabled", "有効")
                                      : t("Disabled", "無効")}
                                  </span>
                                </div>
                                {service.apiEndpoints.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {service.apiEndpoints.map((endpoint) => (
                                      <code
                                        key={endpoint}
                                        className="text-xs bg-background px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                                      >
                                        {endpoint}
                                      </code>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* コアモジュール注意事項 */}
                    {selectedModule.type === "core" && (
                      <div className="mt-6 p-4 bg-muted border border-border rounded-lg">
                        <div className="flex items-start">
                          <svg
                            className="w-5 h-5 text-muted-foreground mt-0.5 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium mb-1">
                              {t("Core Module", "コアモジュール")}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {t(
                                "This is a core module and cannot be disabled.",
                                "このモジュールはコアモジュールのため、無効化できません。",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* アナウンスタブ */}
          {activeTab === "announcements" && (
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
                        const categoryIcons: Record<TemplateCategory, typeof Wrench> = {
                          maintenance: Wrench,
                          security: Shield,
                          update: RefreshCw,
                          general: Megaphone,
                        };
                        const levelColors: Record<string, string> = {
                          critical: "border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950",
                          warning: "border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950",
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
                                  {new Date(
                                    announcement.startAt,
                                  ).toLocaleString(
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
                                    {new Date(
                                      announcement.endAt,
                                    ).toLocaleString(
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
                                  handleToggleAnnouncement(
                                    announcement.id,
                                    checked,
                                  )
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
                    icon={<FaBullhorn className="w-12 h-12 text-muted-foreground" />}
                    message={t("No announcements yet", "アナウンスはまだありません")}
                    action={
                      <Button
                        onClick={openNewAnnouncementModal}
                        variant="outline"
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        {t("Create First Announcement", "最初のアナウンスを作成")}
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 削除確認モーダル（DELETE入力式） */}
      <DeleteConfirmDialog
        open={showDeleteModal && !!userToDelete}
        onOpenChange={(open) => !open && closeDeleteModal()}
        title={t("Delete User", "ユーザを削除")}
        description={
          userToDelete
            ? t(
                `Are you sure you want to delete "${userToDelete.name}"? This action cannot be undone.`,
                `「${userToDelete.name}」を削除してもよろしいですか？この操作は取り消せません。`,
              )
            : ""
        }
        cancelLabel={t("Cancel", "キャンセル")}
        deleteLabel={deleting ? t("Deleting...", "削除中...") : t("Delete", "削除")}
        disabled={deleting}
        onDelete={handleDeleteUser}
        requireConfirmText="DELETE"
        confirmPrompt={t(
          'Type "DELETE" to confirm:',
          "確認のため「DELETE」と入力してください：",
        )}
      />

      {/* パスワードリセット確認ダイアログ */}
      <Dialog
        open={showResetPasswordConfirm && !!userToReset}
        onOpenChange={(open) => {
          if (!open) {
            setShowResetPasswordConfirm(false);
            setUserToReset(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("Reset Password", "パスワードリセット")}
            </DialogTitle>
            <DialogDescription>
              {userToReset
                ? t(
                    `Are you sure you want to reset the password for "${userToReset.name || userToReset.email}"? A temporary password will be generated.`,
                    `「${userToReset.name || userToReset.email}」のパスワードをリセットしますか？仮パスワードが発行されます。`,
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetPasswordConfirm(false);
                setUserToReset(null);
              }}
            >
              {t("Cancel", "キャンセル")}
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              loading={resettingPassword}
            >
              {resettingPassword
                ? t("Resetting...", "リセット中...")
                : t("Reset", "リセット")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 仮パスワード表示ダイアログ */}
      <Dialog
        open={showResetPasswordResult}
        onOpenChange={(open) => {
          if (!open) {
            setShowResetPasswordResult(false);
            setUserToReset(null);
            setTemporaryPassword("");
            setPasswordCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("Temporary Password", "仮パスワード")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Please share this temporary password with the user. They will be required to change it on next login.",
                "この仮パスワードをユーザに伝えてください。次回ログイン時にパスワード変更が求められます。",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <code className="flex-1 text-lg font-mono tracking-wider text-center">
              {temporaryPassword}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(temporaryPassword);
                setPasswordCopied(true);
                setTimeout(() => setPasswordCopied(false), 2000);
              }}
            >
              {passwordCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowResetPasswordResult(false);
                setUserToReset(null);
                setTemporaryPassword("");
                setPasswordCopied(false);
              }}
            >
              {t("Close", "閉じる")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 社員アカウント管理ダイアログ */}
      <Dialog
        open={showCandidateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowCandidateDialog(false);
            setCandidates([]);
            setSelectedCandidates({});
            setCandidateTab("create");
            setRetiredAccounts([]);
            setSelectedRetired(new Set());
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t("Employee Account Management", "社員アカウント管理")}
            </DialogTitle>
            <DialogDescription>
              {candidateTab === "create"
                ? t(
                    "Select employees from the organization chart to create user accounts. A temporary password will be generated for each account.",
                    "組織図の社員データからアカウントを作成します。各アカウントに仮パスワードが自動生成されます。",
                  )
                : t(
                    "Delete accounts of retired employees that are no longer needed.",
                    "退職した社員の不要なアカウントを削除します。",
                  )}
            </DialogDescription>
          </DialogHeader>
          {/* タブ切り替え */}
          <div className="flex gap-1 border-b pb-0">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                candidateTab === "create"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setCandidateTab("create")}
            >
              <UserPlus className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              {t("Create Accounts", "アカウント作成")}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                candidateTab === "retired"
                  ? "border-destructive text-destructive"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setCandidateTab("retired");
                if (candidateOrgId) {
                  fetchRetiredAccounts(candidateOrgId);
                }
              }}
            >
              <Trash2 className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              {t("Retired Accounts", "退職者アカウント")}
            </button>
          </div>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {candidateTab === "create" ? (<>
          {/* === アカウント作成タブ === */}
            {/* フィルター */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {t("Organization", "組織")}
                </Label>
                <Select
                  value={candidateOrgId}
                  onValueChange={(val) => {
                    setCandidateOrgId(val);
                    setCandidateDeptFilter("ALL");
                    setSelectedCandidates({});
                    fetchCandidates(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "Select organization",
                        "組織を選択",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {t("Department", "部署")}
                </Label>
                <Select
                  value={candidateDeptFilter}
                  onValueChange={(val) => {
                    setCandidateDeptFilter(val);
                    setSelectedCandidates({});
                    fetchCandidates(candidateOrgId);
                  }}
                  disabled={!candidateOrgId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      {t("All departments", "全部署")}
                    </SelectItem>
                    {organizations
                      .find((o) => o.id === candidateOrgId)
                      ?.departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {t("Search", "検索")}
                </Label>
                <Input
                  placeholder={t(
                    "Name, employee ID, email...",
                    "名前、社員番号、メール...",
                  )}
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchCandidates(candidateOrgId);
                  }}
                />
              </div>
            </div>

            {/* 候補一覧 */}
            {candidatesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("Loading...", "読み込み中...")}
                </p>
              </div>
            ) : candidates.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={
                            candidates.filter((c) => c.hasEmail).length > 0 &&
                            candidates
                              .filter((c) => c.hasEmail)
                              .every((c) => selectedCandidates[c.employeeId])
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newSelected: Record<string, { role: string }> = {};
                              for (const c of candidates) {
                                if (c.hasEmail) {
                                  newSelected[c.employeeId] = {
                                    role:
                                      selectedCandidates[c.employeeId]?.role ||
                                      c.suggestedRole,
                                  };
                                }
                              }
                              setSelectedCandidates(newSelected);
                            } else {
                              setSelectedCandidates({});
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>{t("Name", "名前")}</TableHead>
                      <TableHead>{t("Email", "メールアドレス")}</TableHead>
                      <TableHead>{t("Department", "部署")}</TableHead>
                      <TableHead>{t("Position", "役職")}</TableHead>
                      <TableHead>{t("Role", "ロール")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((c) => (
                      <TableRow
                        key={c.employeeId}
                        className={!c.hasEmail ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded"
                            disabled={!c.hasEmail}
                            checked={!!selectedCandidates[c.employeeId]}
                            onChange={(e) => {
                              setSelectedCandidates((prev) => {
                                if (e.target.checked) {
                                  return {
                                    ...prev,
                                    [c.employeeId]: {
                                      role:
                                        prev[c.employeeId]?.role ||
                                        c.suggestedRole,
                                    },
                                  };
                                }
                                const { [c.employeeId]: _, ...rest } = prev;
                                return rest;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {c.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.hasEmail ? (
                            c.email
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-orange-600 border-orange-300"
                            >
                              {t("No email", "メール未登録")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.department}
                          {c.section && ` / ${c.section}`}
                        </TableCell>
                        <TableCell className="text-sm">{c.position}</TableCell>
                        <TableCell>
                          <Select
                            value={
                              selectedCandidates[c.employeeId]?.role ||
                              c.suggestedRole
                            }
                            onValueChange={(val) => {
                              setSelectedCandidates((prev) => ({
                                ...prev,
                                [c.employeeId]: { role: val },
                              }));
                            }}
                            disabled={!c.hasEmail}
                          >
                            <SelectTrigger className="h-7 text-xs w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                              <SelectItem value="EXECUTIVE">
                                EXECUTIVE
                              </SelectItem>
                              <SelectItem value="MANAGER">MANAGER</SelectItem>
                              <SelectItem value="USER">USER</SelectItem>
                              <SelectItem value="GUEST">GUEST</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : candidateOrgId ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t(
                  "No candidates found. All employees may already have accounts.",
                  "候補が見つかりません。全社員にアカウントが作成済みの可能性があります。",
                )}
              </div>
            ) : null}
          </>) : (
          <>
          {/* === 退職者アカウントタブ === */}
            {/* 組織選択 */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {t("Organization", "組織")}
                </Label>
                <Select
                  value={candidateOrgId}
                  onValueChange={(val) => {
                    setCandidateOrgId(val);
                    setSelectedRetired(new Set());
                    fetchRetiredAccounts(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "Select organization",
                        "組織を選択",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 退職者アカウント一覧 */}
            {retiredAccountsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("Loading...", "読み込み中...")}
                </p>
              </div>
            ) : retiredAccounts.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={
                            retiredAccounts.length > 0 &&
                            retiredAccounts.every((a) =>
                              selectedRetired.has(a.userId),
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRetired(
                                new Set(retiredAccounts.map((a) => a.userId)),
                              );
                            } else {
                              setSelectedRetired(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>{t("Name", "名前")}</TableHead>
                      <TableHead>{t("Email", "メールアドレス")}</TableHead>
                      <TableHead>{t("Role", "ロール")}</TableHead>
                      <TableHead>{t("Department", "元部署")}</TableHead>
                      <TableHead>{t("Position", "役職")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retiredAccounts.map((a) => (
                      <TableRow key={a.userId}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedRetired.has(a.userId)}
                            onChange={(e) => {
                              setSelectedRetired((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) {
                                  next.add(a.userId);
                                } else {
                                  next.delete(a.userId);
                                }
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {a.name}
                        </TableCell>
                        <TableCell className="text-sm">{a.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {a.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{a.department}</TableCell>
                        <TableCell className="text-sm">{a.position}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : candidateOrgId ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t(
                  "No retired employees with active accounts found.",
                  "アカウントが残っている退職者はいません。",
                )}
              </div>
            ) : null}
          </>
          )}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {candidateTab === "create" ? (
            <>
            <p className="text-sm text-muted-foreground">
              {Object.keys(selectedCandidates).length > 0
                ? t(
                    `${Object.keys(selectedCandidates).length} selected`,
                    `${Object.keys(selectedCandidates).length} 名選択中`,
                  )
                : ""}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCandidateDialog(false);
                  setCandidates([]);
                  setSelectedCandidates({});
                }}
              >
                {t("Cancel", "キャンセル")}
              </Button>
              <Button
                onClick={handleCreateFromEmployees}
                disabled={
                  Object.keys(selectedCandidates).length === 0 ||
                  creatingAccounts
                }
              >
                {creatingAccounts
                  ? t("Creating...", "作成中...")
                  : t(
                      `Create ${Object.keys(selectedCandidates).length} accounts`,
                      `${Object.keys(selectedCandidates).length} 名のアカウントを作成`,
                    )}
              </Button>
            </div>
            </>
            ) : (
            <>
            <p className="text-sm text-muted-foreground">
              {selectedRetired.size > 0
                ? t(
                    `${selectedRetired.size} selected`,
                    `${selectedRetired.size} 名選択中`,
                  )
                : ""}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCandidateDialog(false);
                  setRetiredAccounts([]);
                  setSelectedRetired(new Set());
                }}
              >
                {t("Cancel", "キャンセル")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRetiredDeleteConfirm(true)}
                disabled={selectedRetired.size === 0 || deletingRetired}
              >
                {deletingRetired
                  ? t("Deleting...", "削除中...")
                  : t(
                      `Delete ${selectedRetired.size} accounts`,
                      `${selectedRetired.size} 名のアカウントを削除`,
                    )}
              </Button>
            </div>
            </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 退職者アカウント一括削除確認（DELETE入力式） */}
      <DeleteConfirmDialog
        open={showRetiredDeleteConfirm}
        onOpenChange={setShowRetiredDeleteConfirm}
        title={t("Delete Accounts", "アカウントを削除")}
        description={t(
          `Are you sure you want to delete ${selectedRetired.size} retired employee accounts? This action cannot be undone.`,
          `退職者${selectedRetired.size}名のアカウントを削除してもよろしいですか？この操作は取り消せません。`,
        )}
        cancelLabel={t("Cancel", "キャンセル")}
        deleteLabel={deletingRetired ? t("Deleting...", "削除中...") : t("Delete", "削除")}
        disabled={deletingRetired}
        onDelete={handleDeleteRetiredAccounts}
        requireConfirmText="DELETE"
        confirmPrompt={t(
          'Type "DELETE" to confirm:',
          "確認のため「DELETE」と入力してください：",
        )}
      />

      {/* アカウント作成結果ダイアログ */}
      <Dialog
        open={showCreateResult}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateResult(false);
            setCreateResult(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t("Account Creation Results", "アカウント作成結果")}
            </DialogTitle>
          </DialogHeader>
          {createResult && (
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* 統計 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <p className="text-2xl font-bold text-green-600">
                    {createResult.created.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Created", "作成")}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                  <p className="text-2xl font-bold text-yellow-600">
                    {createResult.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Skipped", "スキップ")}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <p className="text-2xl font-bold text-red-600">
                    {createResult.errors.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Errors", "エラー")}
                  </p>
                </div>
              </div>

              {/* 作成アカウント一覧 */}
              {createResult.created.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      {t("Created Accounts", "作成されたアカウント")}
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateResultCsvDownload}
                    >
                      {t("Download CSV", "CSVダウンロード")}
                    </Button>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("Name", "名前")}</TableHead>
                          <TableHead>{t("Email", "メールアドレス")}</TableHead>
                          <TableHead>{t("Role", "ロール")}</TableHead>
                          <TableHead>
                            {t("Temporary Password", "仮パスワード")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {createResult.created.map((account) => (
                          <TableRow key={account.email}>
                            <TableCell className="text-sm">
                              {account.name || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {account.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {account.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                                {account.temporaryPassword}
                              </code>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* エラー一覧 */}
              {createResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600">
                    {t("Errors", "エラー")}
                  </h4>
                  <div className="space-y-1">
                    {createResult.errors.map((err) => (
                      <p
                        key={`error-${err.employeeId}`}
                        className="text-sm text-muted-foreground"
                      >
                        {err.employeeId}: {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setShowCreateResult(false);
                setCreateResult(null);
              }}
            >
              {t("Close", "閉じる")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        {t("Template Parameters", "テンプレートパラメータ")}
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
                                handlePlaceholderChange(ph.key, e.target.value)
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
                  setAnnouncementForm((f) => ({ ...f, title: e.target.value }))
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
                      notifyUsers: value === "critical" || value === "warning",
                    }),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t("Info", "お知らせ")}</SelectItem>
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
                    setAnnouncementForm((f) => ({ ...f, notifyUsers: checked }))
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
                <Label htmlFor="endAt">{t("End Date/Time", "終了日時")}</Label>
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
                  {t("Leave empty for no end date", "空欄の場合は終了日時なし")}
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
        deleteLabel={announcementDeleting ? t("Deleting...", "削除中...") : t("Delete", "削除")}
        disabled={announcementDeleting}
        onDelete={handleDeleteAnnouncement}
        requireConfirmText="DELETE"
        confirmPrompt={t(
          'Type "DELETE" to confirm:',
          "確認のため「DELETE」と入力してください：",
        )}
      />
    </div>
  );
}

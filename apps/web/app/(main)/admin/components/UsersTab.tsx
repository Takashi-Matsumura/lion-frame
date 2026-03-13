"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { UserRoleChanger } from "@/components/UserRoleChanger";
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
import type {
  AdminUser,
  BulkCreateResult,
  EmployeeCandidate,
  OrganizationOption,
  PaginatedUsers,
  RetiredAccount,
} from "@/types/admin";

interface UsersTabProps {
  language: "en" | "ja";
  currentUserId: string;
}

export function UsersTab({ language, currentUserId }: UsersTabProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  // アカウント管理タブの状態
  const [paginatedUsers, setPaginatedUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [passwordStatusFilter, setPasswordStatusFilter] =
    useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "email" | "role" | "createdAt">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // パスワードリセットの状態
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] =
    useState(false);
  const [showResetPasswordResult, setShowResetPasswordResult] = useState(false);
  const [userToReset, setUserToReset] = useState<AdminUser | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);

  // 社員からアカウント作成の状態
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  const [showCreateResult, setShowCreateResult] = useState(false);
  const [candidateOrgId, setCandidateOrgId] = useState<string>("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateDeptFilter, setCandidateDeptFilter] =
    useState<string>("ALL");
  const [candidates, setCandidates] = useState<EmployeeCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, { role: string }>
  >({});
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [createResult, setCreateResult] = useState<BulkCreateResult | null>(
    null,
  );
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  // 退職者アカウント管理の状態
  const [candidateTab, setCandidateTab] = useState<"create" | "retired">(
    "create",
  );
  const [retiredAccounts, setRetiredAccounts] = useState<RetiredAccount[]>([]);
  const [retiredAccountsLoading, setRetiredAccountsLoading] = useState(false);
  const [selectedRetired, setSelectedRetired] = useState<Set<string>>(
    new Set(),
  );
  const [deletingRetired, setDeletingRetired] = useState(false);
  const [showRetiredDeleteConfirm, setShowRetiredDeleteConfirm] =
    useState(false);

  // ユーザデータを取得
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter !== "ALL" && { role: roleFilter }),
        ...(passwordStatusFilter !== "ALL" && {
          passwordStatus: passwordStatusFilter,
        }),
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
  }, [page, pageSize, searchQuery, roleFilter, passwordStatusFilter, sortBy, sortOrder]);

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
    setPage(1);
    fetchUsers();
  };

  // ソートハンドラ
  const handleSort = (column: "name" | "email" | "role" | "createdAt") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // 削除確認モーダルを開く
  const openDeleteModal = (user: AdminUser) => {
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

      closeDeleteModal();
      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(
        t(
          error instanceof Error ? error.message : "Failed to delete user",
          error instanceof Error
            ? error.message
            : "ユーザの削除に失敗しました",
        ),
      );
    } finally {
      setDeleting(false);
    }
  }, [userToDelete, fetchUsers, t, closeDeleteModal]);

  // 組織一覧を取得
  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/organization");
      const data = await res.json();
      if (res.ok && data.organizations) {
        setOrganizations(
          data.organizations.map(
            (org: {
              id: string;
              name: string;
              departments: { id: string; name: string }[];
            }) => ({
              id: org.id,
              name: org.name,
              departments: org.departments.map(
                (d: { id: string; name: string }) => ({
                  id: d.id,
                  name: d.name,
                }),
              ),
            }),
          ),
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
  const fetchRetiredAccounts = useCallback(async (orgId: string) => {
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
  }, []);

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
          data.errorJa ||
            data.error ||
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

  return (
    <>
      {/* アカウント管理タブ */}
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
                                  {user.forcePasswordChange &&
                                    (user.passwordExpiresAt &&
                                    new Date(user.passwordExpiresAt) <=
                                      new Date() ? (
                                      <Badge
                                        variant="destructive"
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {t("Expired", "期限切れ")}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {t("Temp Password", "仮パスワード")}
                                      </Badge>
                                    ))}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {user.email}
                                </span>
                                {user.forcePasswordChange &&
                                  user.passwordExpiresAt && (
                                    <span
                                      className={`text-[11px] ${new Date(user.passwordExpiresAt) > new Date() ? "text-muted-foreground" : "text-destructive"}`}
                                    >
                                      {t("Expires: ", "期限: ")}
                                      {new Date(
                                        user.passwordExpiresAt,
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
                                      language === "ja" ? "ja-JP" : "en-US",
                                      {
                                        year: "numeric",
                                        month:
                                          language === "ja" ? "long" : "short",
                                        day: "numeric",
                                      },
                                    )
                                  : t("Never", "未ログイン")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t("Created", "作成")}:{" "}
                                {new Date(user.createdAt).toLocaleDateString(
                                  language === "ja" ? "ja-JP" : "en-US",
                                  {
                                    year: "numeric",
                                    month:
                                      language === "ja" ? "long" : "short",
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
                                        onClick={() => openDeleteModal(user)}
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
        deleteLabel={
          deleting ? t("Deleting...", "削除中...") : t("Delete", "削除")
        }
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
            {candidateTab === "create" ? (
              <>
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
                        if (e.key === "Enter")
                          fetchCandidates(candidateOrgId);
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
                                candidates.filter((c) => c.hasEmail).length >
                                  0 &&
                                candidates
                                  .filter((c) => c.hasEmail)
                                  .every(
                                    (c) =>
                                      selectedCandidates[c.employeeId],
                                  )
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newSelected: Record<
                                    string,
                                    { role: string }
                                  > = {};
                                  for (const c of candidates) {
                                    if (c.hasEmail) {
                                      newSelected[c.employeeId] = {
                                        role:
                                          selectedCandidates[c.employeeId]
                                            ?.role || c.suggestedRole,
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
                          <TableHead>
                            {t("Email", "メールアドレス")}
                          </TableHead>
                          <TableHead>
                            {t("Department", "部署")}
                          </TableHead>
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
                                checked={
                                  !!selectedCandidates[c.employeeId]
                                }
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
                                    const {
                                      [c.employeeId]: _,
                                      ...rest
                                    } = prev;
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
                            <TableCell className="text-sm">
                              {c.position}
                            </TableCell>
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
                                  <SelectItem value="ADMIN">
                                    ADMIN
                                  </SelectItem>
                                  <SelectItem value="EXECUTIVE">
                                    EXECUTIVE
                                  </SelectItem>
                                  <SelectItem value="MANAGER">
                                    MANAGER
                                  </SelectItem>
                                  <SelectItem value="USER">USER</SelectItem>
                                  <SelectItem value="GUEST">
                                    GUEST
                                  </SelectItem>
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
              </>
            ) : (
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
                                    new Set(
                                      retiredAccounts.map((a) => a.userId),
                                    ),
                                  );
                                } else {
                                  setSelectedRetired(new Set());
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>{t("Name", "名前")}</TableHead>
                          <TableHead>
                            {t("Email", "メールアドレス")}
                          </TableHead>
                          <TableHead>{t("Role", "ロール")}</TableHead>
                          <TableHead>
                            {t("Department", "元部署")}
                          </TableHead>
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
                            <TableCell className="text-sm">
                              {a.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {a.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {a.department}
                            </TableCell>
                            <TableCell className="text-sm">
                              {a.position}
                            </TableCell>
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
                    disabled={
                      selectedRetired.size === 0 || deletingRetired
                    }
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
        deleteLabel={
          deletingRetired
            ? t("Deleting...", "削除中...")
            : t("Delete", "削除")
        }
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
                          <TableHead>
                            {t("Email", "メールアドレス")}
                          </TableHead>
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
    </>
  );
}

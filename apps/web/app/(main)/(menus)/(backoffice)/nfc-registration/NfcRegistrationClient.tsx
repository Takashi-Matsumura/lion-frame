"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CreditCard, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { nfcRegistrationTranslations, type Language } from "./translations";

type NfcReaderModule = typeof import("@/lib/addon-modules/nfc-card/nfc-reader");

interface EmployeeListItem {
  id: string;
  employeeId: string;
  name: string;
  position: string | null;
  department: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  nfcCards: { id: string; cardId: string; issuedAt: string }[];
}

interface EmployeeDetail {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  department: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  nfcCards: NfcCardData[];
}

interface NfcCardData {
  id: string;
  cardId: string;
  isActive: boolean;
  issuedAt: string;
  revokedAt: string | null;
}

const PAGE_SIZE = 20;

/**
 * ページ全体の高さ（ヘッダー pt-24 = 96px + main py-8 = 64px を差し引く）
 * flex レイアウトでテーブルが残り領域を自動的に埋める
 */
const PAGE_HEIGHT = "calc(100vh - 160px)";

/** ソナーアニメーション（NFC読み取り中） */
function NfcSonarAnimation() {
  return (
    <div className="relative w-20 h-20 mx-auto">
      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping [animation-duration:2s]" />
      <div className="absolute inset-2 bg-primary/10 rounded-full animate-ping [animation-duration:2s] [animation-delay:0.5s]" />
      <div className="relative w-20 h-20 bg-muted/50 border-2 border-primary/30 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0"
          />
          <circle cx="12" cy="18" r="1.5" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

export function NfcRegistrationClient({ language }: { language: Language }) {
  const t = nfcRegistrationTranslations[language];

  // 一覧用の状態
  const [allEmployees, setAllEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [page, setPage] = useState(1);

  // 詳細表示用の状態
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [readCardId, setReadCardId] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const nfcModuleRef = useRef<NfcReaderModule | null>(null);

  // 社員一覧を取得
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoadingList(true);
      const res = await fetch("/api/nfc-card/employees");
      if (res.ok) {
        const data = await res.json();
        setAllEmployees(data.employees);
      }
    } catch {
      console.error("Failed to fetch employees");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // 社員番号でフィルタリング
  const filteredEmployees = useMemo(() => {
    if (!searchFilter.trim()) return allEmployees;
    const query = searchFilter.trim().toLowerCase();
    return allEmployees.filter((emp) =>
      emp.employeeId.toLowerCase().includes(query),
    );
  }, [allEmployees, searchFilter]);

  // ページネーション
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const pagedEmployees = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, page]);

  const handleFilterChange = useCallback((value: string) => {
    setSearchFilter(value);
    setPage(1);
  }, []);

  // 社員選択 → 詳細取得
  const handleSelectEmployee = useCallback(async (empId: string) => {
    setIsSearching(true);
    setSelectedEmployee(null);
    setReadCardId("");
    try {
      const res = await fetch(`/api/nfc-card/employee/${encodeURIComponent(empId)}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.messageJa || err.message || t.employeeNotFound);
        return;
      }
      const data = await res.json();
      setSelectedEmployee(data.employee);
    } catch {
      toast.error(t.employeeNotFound);
    } finally {
      setIsSearching(false);
    }
  }, [t]);

  // 一覧に戻る
  const handleBackToList = useCallback(() => {
    setSelectedEmployee(null);
    setReadCardId("");
    fetchEmployees();
  }, [fetchEmployees]);

  // NFC関連
  const loadNfcModule = useCallback(async () => {
    if (!nfcModuleRef.current) {
      nfcModuleRef.current = await import(
        "@/lib/addon-modules/nfc-card/nfc-reader"
      );
    }
    return nfcModuleRef.current;
  }, []);

  const handleRead = useCallback(async () => {
    try {
      const nfc = await loadNfcModule();
      if (!nfc.isWebUsbSupported()) {
        toast.error(t.webUsbNotSupported);
        return;
      }
      setIsReading(true);
      setReadCardId("");
      const result = await nfc.connectAndRead();
      setReadCardId(result.cardId);
      toast.success(t.readSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.readTimeout);
    } finally {
      setIsReading(false);
    }
  }, [loadNfcModule, t]);

  const refreshEmployee = useCallback(async () => {
    if (!selectedEmployee) return;
    const res = await fetch(
      `/api/nfc-card/employee/${encodeURIComponent(selectedEmployee.employeeId)}`,
    );
    if (res.ok) {
      const data = await res.json();
      setSelectedEmployee(data.employee);
    }
  }, [selectedEmployee]);

  const handleRegister = useCallback(async () => {
    if (!readCardId || !selectedEmployee) return;
    setIsRegistering(true);
    try {
      const res = await fetch("/api/nfc-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: readCardId,
          employeeId: selectedEmployee.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.messageJa || err.message || t.registerError);
        return;
      }
      toast.success(t.registerSuccess);
      await refreshEmployee();
      setReadCardId("");
    } catch {
      toast.error(t.registerError);
    } finally {
      setIsRegistering(false);
    }
  }, [readCardId, selectedEmployee, t, refreshEmployee]);

  const handleRevoke = useCallback(
    async (cardDbId: string) => {
      if (!confirm(t.revokeConfirm)) return;
      try {
        const res = await fetch(`/api/nfc-card/${cardDbId}`, {
          method: "PATCH",
        });
        if (!res.ok) {
          toast.error(t.registerError);
          return;
        }
        toast.success(t.revokeSuccess);
        await refreshEmployee();
      } catch {
        toast.error(t.registerError);
      }
    },
    [t, refreshEmployee],
  );

  const activeCard = selectedEmployee?.nfcCards.find((c) => c.isActive);
  const inactiveCards = selectedEmployee?.nfcCards.filter((c) => !c.isActive) ?? [];

  // 社員詳細（カード登録）画面
  if (selectedEmployee) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* 戻るボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToList}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.backToList}
        </Button>

        {/* 社員情報 + カード読み取り/登録 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* 社員情報 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  <span className="font-mono text-muted-foreground text-sm mr-2">
                    {selectedEmployee.employeeId}
                  </span>
                  {selectedEmployee.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[selectedEmployee.department?.name, selectedEmployee.section?.name, selectedEmployee.position]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
              </div>
              {activeCard ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">
                    {t.active}
                  </Badge>
                  <span className="font-mono text-xs">{activeCard.cardId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRevoke(activeCard.id)}
                  >
                    {t.revoke}
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary">{t.noCardRegistered}</Badge>
              )}
            </div>

            <div className="border-t" />

            {/* カード読み取り → 登録 */}
            {readCardId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.cardId}</p>
                    <p className="font-mono text-lg font-semibold">{readCardId}</p>
                  </div>
                  <Button onClick={handleRead} variant="ghost" size="sm">
                    {t.reread}
                  </Button>
                </div>
                {activeCard && activeCard.cardId !== readCardId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    * {activeCard.cardId} {t.autoRevokeNote}
                  </p>
                )}
                <Button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="w-full"
                  size="lg"
                >
                  {isRegistering ? t.registering : t.register}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                {isReading ? (
                  <div className="space-y-4">
                    <NfcSonarAnimation />
                    <p className="text-sm text-muted-foreground">{t.reading}</p>
                  </div>
                ) : (
                  <Button onClick={handleRead} size="lg">
                    {t.readCard}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* カード履歴 */}
        {inactiveCards.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">{t.historyTitle}</p>
              <div className="space-y-1">
                {inactiveCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 py-1 text-xs text-muted-foreground"
                  >
                    <span className="font-mono">{card.cardId}</span>
                    <span>
                      {new Date(card.issuedAt).toLocaleDateString("ja-JP")}
                      {card.revokedAt &&
                        ` → ${new Date(card.revokedAt).toLocaleDateString("ja-JP")}`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // 社員一覧画面
  return (
    <div className="flex flex-col gap-4" style={{ height: PAGE_HEIGHT }}>
      {/* 検索バー */}
      <div className="shrink-0 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            placeholder={t.employeeIdPlaceholder}
            className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* 件数 + ページネーション */}
      <div className="shrink-0 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t.totalCount} {filteredEmployees.length}
          {searchFilter.trim() && (
            <span> / {allEmployees.length}</span>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {t.prev}
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t.next}
            </Button>
          </div>
        )}
      </div>

      {/* 社員テーブル */}
      {isLoadingList ? (
        <Card className="shrink-0">
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card className="shrink-0">
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.noEmployees}
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 min-h-0 flex flex-col">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t.columnEmployeeId}</TableHead>
                <TableHead>{t.columnName}</TableHead>
                <TableHead>{t.columnDepartment}</TableHead>
                <TableHead>{t.columnPosition}</TableHead>
                <TableHead className="w-[140px]">{t.columnNfcStatus}</TableHead>
                <TableHead className="w-[80px]">{t.columnAction}</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Table>
              <TableBody>
                {pagedEmployees.map((emp) => {
                  const hasCard = emp.nfcCards.length > 0;
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm w-[120px]">
                        {emp.employeeId}
                      </TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[emp.department?.name, emp.section?.name]
                          .filter(Boolean)
                          .join(" / ")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.position || "—"}
                      </TableCell>
                      <TableCell className="w-[140px]">
                        {hasCard ? (
                          <Badge variant="default" className="bg-green-600 gap-1">
                            <CreditCard className="h-3 w-3" />
                            {t.registered}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t.unregistered}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="w-[80px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectEmployee(emp.employeeId)}
                        >
                          {t.selectEmployee}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* 検索中のローディング */}
      {isSearching && (
        <Card className="shrink-0">
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

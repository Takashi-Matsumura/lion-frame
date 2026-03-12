"use client";

import { useCallback, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { nfcRegistrationTranslations, type Language } from "./translations";

type NfcReaderModule = typeof import("@/lib/addon-modules/nfc-card/nfc-reader");

interface EmployeeData {
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

  const [searchId, setSearchId] = useState("");
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [readCardId, setReadCardId] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const nfcModuleRef = useRef<NfcReaderModule | null>(null);

  const loadNfcModule = useCallback(async () => {
    if (!nfcModuleRef.current) {
      nfcModuleRef.current = await import(
        "@/lib/addon-modules/nfc-card/nfc-reader"
      );
    }
    return nfcModuleRef.current;
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchId.trim()) return;
    setIsSearching(true);
    setEmployee(null);
    setReadCardId("");

    try {
      const res = await fetch(
        `/api/nfc-card/employee/${encodeURIComponent(searchId.trim())}`,
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.messageJa || err.message || t.employeeNotFound);
        return;
      }
      const data = await res.json();
      setEmployee(data.employee);
    } catch {
      toast.error(t.employeeNotFound);
    } finally {
      setIsSearching(false);
    }
  }, [searchId, t]);

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
    if (!employee) return;
    const res = await fetch(
      `/api/nfc-card/employee/${encodeURIComponent(employee.employeeId)}`,
    );
    if (res.ok) {
      const data = await res.json();
      setEmployee(data.employee);
    }
  }, [employee]);

  const handleRegister = useCallback(async () => {
    if (!readCardId || !employee) return;
    setIsRegistering(true);
    try {
      const res = await fetch("/api/nfc-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: readCardId,
          employeeId: employee.id,
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
  }, [readCardId, employee, t, refreshEmployee]);

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

  const activeCard = employee?.nfcCards.find((c) => c.isActive);
  const inactiveCards = employee?.nfcCards.filter((c) => !c.isActive) ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 検索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t.employeeIdPlaceholder}
              className="flex-1 px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchId.trim()}
            >
              {isSearching ? t.searching : t.search}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 検索中 */}
      {isSearching && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardContent>
        </Card>
      )}

      {/* 社員情報 + カード読み取り/登録 */}
      {employee && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* 社員情報 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  <span className="font-mono text-muted-foreground text-sm mr-2">
                    {employee.employeeId}
                  </span>
                  {employee.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[employee.department?.name, employee.section?.name, employee.position]
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
      )}

      {/* カード履歴 */}
      {employee && inactiveCards.length > 0 && (
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

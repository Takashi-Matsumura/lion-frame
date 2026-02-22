"use client";

import { useCallback, useEffect, useState } from "react";
import { approvalTranslations } from "./translations";
import ApprovalDialog from "./components/ApprovalDialog";

interface PendingApproval {
  id: string;
  status: string;
  createdAt: string;
  instance: {
    id: string;
    title: string;
    formData: Record<string, string | undefined>;
    createdAt: string;
    template: { name: string; nameJa: string; category: string };
    requester: { id: string; name: string | null; email: string | null };
  };
  templateStep: { name: string; nameJa: string; stepType: string };
}

interface ApprovalsClientProps {
  language: "en" | "ja";
}

export default function ApprovalsClient({ language }: ApprovalsClientProps) {
  const t = approvalTranslations[language];
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] =
    useState<PendingApproval | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/workflow/approvals");
      if (res.ok) {
        setApprovals(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleProcessed = () => {
    setSelectedApproval(null);
    fetchApprovals();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approvals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">{t.noPending}</p>
          <p className="text-sm mt-1">{t.noPendingDescription}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {approval.instance.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {t.requester}:{" "}
                      {approval.instance.requester.name ||
                        approval.instance.requester.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      &middot;
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(approval.instance.createdAt).toLocaleDateString(
                        language === "ja" ? "ja-JP" : "en-US",
                      )}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApproval(approval)}
                  className="ml-4 text-sm text-primary hover:underline font-medium"
                >
                  {t.review}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedApproval && (
        <ApprovalDialog
          language={language}
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onProcessed={handleProcessed}
        />
      )}
    </div>
  );
}

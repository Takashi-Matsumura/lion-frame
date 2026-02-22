"use client";

import { useCallback, useEffect, useState } from "react";
import { workflowSettingsTranslations } from "./translations";

interface TemplateStep {
  id: string;
  order: number;
  name: string;
  nameJa: string;
  stepType: string;
  targetType: string;
  approvalLevels: number | null;
}

interface Template {
  id: string;
  name: string;
  nameJa: string;
  category: string;
  isActive: boolean;
  steps: TemplateStep[];
  _count: { instances: number };
}

interface LeaveType {
  id: string;
  name: string;
  nameJa: string;
  maxDays: number | null;
  requiresApproval: boolean;
  isActive: boolean;
  order: number;
}

interface WorkflowSettingsClientProps {
  language: "en" | "ja";
}

export default function WorkflowSettingsClient({
  language,
}: WorkflowSettingsClientProps) {
  const t = workflowSettingsTranslations[language];
  const [activeTab, setActiveTab] = useState<"templates" | "leaveTypes">(
    "templates",
  );
  const [templates, setTemplates] = useState<Template[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryLabel = useCallback(
    (category: string) => {
      const map: Record<string, string> = {
        LEAVE: t.categoryLeave,
        TRAVEL: t.categoryTravel,
        EXPENSE: t.categoryExpense,
        GENERAL: t.categoryGeneral,
      };
      return map[category] || category;
    },
    [t],
  );

  const stepTypeLabel = useCallback(
    (type: string) => {
      const map: Record<string, string> = {
        APPROVAL: t.stepApproval,
        PROCESS: t.stepProcess,
        REVIEW: t.stepReview,
        NOTIFY: t.stepNotify,
      };
      return map[type] || type;
    },
    [t],
  );

  const targetTypeLabel = useCallback(
    (type: string) => {
      const map: Record<string, string> = {
        APPROVAL_CHAIN: t.targetApprovalChain,
        DEPARTMENT_MANAGER: t.targetDeptManager,
        ROLE: t.targetRole,
        SPECIFIC_USER: t.targetSpecificUser,
      };
      return map[type] || type;
    },
    [t],
  );

  const fetchData = useCallback(async () => {
    try {
      const [templatesRes, leaveTypesRes] = await Promise.all([
        fetch("/api/admin/workflow/templates"),
        fetch("/api/workflow/leave-types"),
      ]);

      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (leaveTypesRes.ok) setLeaveTypes(await leaveTypesRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.templates}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("leaveTypes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "leaveTypes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.leaveTypes}
        </button>
      </div>

      {/* Templates */}
      {activeTab === "templates" && (
        <div>
          {templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">{t.noTemplates}</p>
              <p className="text-sm mt-1">{t.noTemplatesDescription}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">
                        {language === "ja" ? tmpl.nameJa : tmpl.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {categoryLabel(tmpl.category)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${tmpl.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                        >
                          {tmpl.isActive ? t.active : t.inactive}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t.instances}: {tmpl._count.instances}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  {tmpl.steps.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {t.steps}
                      </p>
                      <div className="space-y-1">
                        {tmpl.steps.map((step) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-muted-foreground text-xs w-6">
                              #{step.order}
                            </span>
                            <span>
                              {language === "ja" ? step.nameJa : step.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({stepTypeLabel(step.stepType)} /{" "}
                              {targetTypeLabel(step.targetType)}
                              {step.approvalLevels
                                ? ` / L${step.approvalLevels}`
                                : ""}
                              )
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leave Types */}
      {activeTab === "leaveTypes" && (
        <div>
          {leaveTypes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">{t.noLeaveTypes}</p>
              <p className="text-sm mt-1">{t.noLeaveTypesDescription}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">{t.leaveTypeName}</th>
                    <th className="pb-2 font-medium">{t.maxDays}</th>
                    <th className="pb-2 font-medium">{t.requiresApproval}</th>
                    <th className="pb-2 font-medium">{t.order}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((lt) => (
                    <tr key={lt.id} className="border-b">
                      <td className="py-2">
                        {language === "ja" ? lt.nameJa : lt.name}
                      </td>
                      <td className="py-2">
                        {lt.maxDays ?? t.unlimited}
                      </td>
                      <td className="py-2">
                        {lt.requiresApproval ? t.yes : t.no}
                      </td>
                      <td className="py-2">{lt.order}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

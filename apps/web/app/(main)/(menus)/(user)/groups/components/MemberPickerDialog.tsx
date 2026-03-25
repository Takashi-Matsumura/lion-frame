"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FiSearch, FiCheck } from "react-icons/fi";

interface EmployeeResult {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  department?: { name: string };
  section?: { name: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  existingMemberIds: string[];
  onAdded: () => void;
  t: Record<string, string>;
}

export function MemberPickerDialog({
  open,
  onOpenChange,
  groupId,
  existingMemberIds,
  onAdded,
  t,
}: Props) {
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchEmployees = useCallback(async (query: string) => {
    if (!query.trim()) {
      setEmployees([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: query,
        limit: "20",
        activeOnly: "true",
      });
      const res = await fetch(`/api/organization/employees?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) searchEmployees(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, open, searchEmployees]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setEmployees([]);
      setSelected(new Set());
    }
  }, [open]);

  const toggleSelect = (empId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: Array.from(selected) }),
      });
      if (res.ok) {
        onAdded();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.addMembers}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchEmployees}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {selected.size > 0 && (
          <div className="text-sm text-muted-foreground">
            {t.selected}: {selected.size}
          </div>
        )}

        <div className="max-h-72 min-h-[120px] space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : employees.length === 0 && search ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.noResults}
            </p>
          ) : (
            employees.map((emp) => {
              const isExisting = existingMemberIds.includes(emp.id);
              const isSelected = selected.has(emp.id);

              return (
                <button
                  key={emp.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                    isExisting
                      ? "cursor-not-allowed opacity-50"
                      : isSelected
                        ? "bg-primary/10"
                        : "hover:bg-accent/50"
                  }`}
                  onClick={() => !isExisting && toggleSelect(emp.id)}
                  disabled={isExisting}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      isSelected || isExisting
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                  >
                    {(isSelected || isExisting) && (
                      <FiCheck className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {emp.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {emp.employeeId}
                      </span>
                      {isExisting && (
                        <Badge variant="secondary" className="text-xs">
                          {t.member}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {emp.position}
                      {emp.department?.name && ` | ${emp.department.name}`}
                      {emp.section?.name && ` > ${emp.section.name}`}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            loading={saving}
          >
            {t.add} ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

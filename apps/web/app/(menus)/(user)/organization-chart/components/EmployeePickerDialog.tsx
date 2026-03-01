"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Translations } from "../translations";

interface Candidate {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  positionCode: string | null;
}

export interface PickerContext {
  /** ダイアログタイトル */
  title: string;
  /** 現在の割当先 */
  currentId: string | null;
  /** 除外するID（自分自身など） */
  excludeId?: string;
}

interface EmployeePickerDialogProps {
  context: PickerContext | null;
  t: Translations;
  onSelect: (employeeId: string | null) => void;
  onClose: () => void;
}

export function EmployeePickerDialog({
  context,
  t,
  onSelect,
  onClose,
}: EmployeePickerDialogProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organization/employees?limit=500");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const employees = (data.employees || []).map(
        (e: {
          id: string;
          employeeId: string;
          name: string;
          position: string;
          positionCode: string | null;
        }) => ({
          id: e.id,
          employeeId: e.employeeId,
          name: e.name,
          position: e.position,
          positionCode: e.positionCode,
        }),
      );
      setCandidates(employees);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (context) {
      fetchCandidates();
      setSearch("");
    } else {
      setCandidates([]);
    }
  }, [context, fetchCandidates]);

  const handleSelect = (employeeId: string | null) => {
    setUpdating(true);
    onSelect(employeeId);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setSearch("");
      setUpdating(false);
    }
  };

  const filtered = candidates.filter((emp) => {
    if (context?.excludeId && emp.id === context.excludeId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q) ||
      emp.position.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={!!context} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{context?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={t.searchEmployee}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ScrollArea className="h-[300px] border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t.noCandidates}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelect(emp.id)}
                    disabled={updating}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-muted transition-colors",
                      context?.currentId === emp.id && "bg-primary/10",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.employeeId} / {emp.position}
                      </p>
                    </div>
                    {context?.currentId === emp.id && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-between">
            {context?.currentId && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleSelect(null)}
                disabled={updating}
              >
                {t.remove}
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>
              {t.close}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

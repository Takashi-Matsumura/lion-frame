"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type {
  SelectedUnit,
  ManagerCandidate,
} from "@/types/organization";
import type { DataManagementTranslation } from "../../translations";

interface ManagerAssignDialogProps {
  selectedUnit: SelectedUnit | null;
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
  onClose: () => void;
  onAssigned: () => void;
}

export function ManagerAssignDialog({
  selectedUnit,
  organizationId,
  language,
  t,
  onClose,
  onAssigned,
}: ManagerAssignDialogProps) {
  const [managerCandidates, setManagerCandidates] = useState<
    ManagerCandidate[]
  >([]);
  const [managerSearch, setManagerSearch] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch manager candidates for manager selection
  const fetchManagerCandidates = useCallback(
    async (unitType: string, unitId: string) => {
      try {
        setLoadingCandidates(true);
        const params = new URLSearchParams();
        params.set("type", unitType);
        params.set("id", unitId);

        const response = await fetch(
          `/api/admin/organization/manager-candidates?${params}`,
        );
        if (!response.ok) throw new Error("Failed to fetch manager candidates");
        const data = await response.json();
        setManagerCandidates(data.candidates || []);
      } catch (err) {
        console.error("Error fetching manager candidates:", err);
        setManagerCandidates([]);
      } finally {
        setLoadingCandidates(false);
      }
    },
    [],
  );

  // Handle dialog open change - fetch candidates when opening
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setManagerSearch("");
      setManagerCandidates([]);
    }
  };

  // Fetch candidates when selectedUnit changes
  const prevUnitKey = useRef<string | null>(null);
  useEffect(() => {
    if (selectedUnit) {
      const key = `${selectedUnit.type}:${selectedUnit.id}`;
      if (prevUnitKey.current !== key) {
        prevUnitKey.current = key;
        fetchManagerCandidates(selectedUnit.type, selectedUnit.id);
        setManagerSearch("");
      }
    } else {
      prevUnitKey.current = null;
    }
  }, [selectedUnit, fetchManagerCandidates]);

  // Handle manager assignment
  const handleAssignManager = async (employeeId: string | null) => {
    if (!selectedUnit) return;

    try {
      setUpdating(true);
      const response = await fetch("/api/admin/organization/manager", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedUnit.type,
          id: selectedUnit.id,
          managerId: employeeId,
        }),
      });

      if (!response.ok) throw new Error("Failed to update manager");

      onAssigned();
      onClose();
    } catch (err) {
      console.error("Error updating manager:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Filter manager candidates by search
  const filteredCandidates = managerCandidates.filter(
    (emp) =>
      emp.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(managerSearch.toLowerCase()) ||
      emp.position.toLowerCase().includes(managerSearch.toLowerCase()),
  );

  return (
    <Dialog open={!!selectedUnit} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {selectedUnit?.currentManager ? t.changeManager : t.assignManager}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Unit Info */}
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">{selectedUnit?.name}</p>
            {selectedUnit?.currentManager && (
              <p className="text-xs text-muted-foreground mt-1">
                {t.manager}: {selectedUnit.currentManager.name} (
                {selectedUnit.currentManager.position})
              </p>
            )}
          </div>

          {/* Search */}
          <Input
            placeholder={t.searchPlaceholder}
            value={managerSearch}
            onChange={(e) => setManagerSearch(e.target.value)}
          />

          {/* Employee List */}
          <ScrollArea className="h-[300px] border rounded-md">
            {loadingCandidates ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t.noEmployees}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredCandidates.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleAssignManager(emp.id)}
                    disabled={updating}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-md text-left hover:bg-muted transition-colors",
                      selectedUnit?.currentManager?.id === emp.id &&
                        "bg-primary/10",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.employeeId} / {emp.position}
                      </p>
                    </div>
                    {selectedUnit?.currentManager?.id === emp.id && (
                      <Badge variant="secondary" className="text-xs">
                        {t.manager}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-between">
            {selectedUnit?.currentManager && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAssignManager(null)}
                disabled={updating}
              >
                {t.removeManager}
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

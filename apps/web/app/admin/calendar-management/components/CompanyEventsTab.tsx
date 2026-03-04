"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyEventsSkeleton } from "../CalendarManagementSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { calendarManagementTranslations } from "../translations";

interface CompanyEvent {
  id: string;
  title: string;
  titleEn: string | null;
  startDate: string;
  endDate: string;
  category: string;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface CompanyEventFormData {
  title: string;
  titleEn: string;
  startDate: string;
  endDate: string;
  category: string;
  description: string;
  departmentId: string;
}

const INITIAL_FORM: CompanyEventFormData = {
  title: "",
  titleEn: "",
  startDate: "",
  endDate: "",
  category: "event",
  description: "",
  departmentId: "",
};

interface CompanyEventsTabProps {
  language: "en" | "ja";
}

export function CompanyEventsTab({ language }: CompanyEventsTabProps) {
  const t = calendarManagementTranslations[language].companyEvents;

  const currentYear = new Date().getFullYear();
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterYear, setFilterYear] = useState(String(currentYear));

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CompanyEvent | null>(null);
  const [form, setForm] = useState<CompanyEventFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<CompanyEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const year = Number(filterYear);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const categoryParam =
      filterCategory !== "all" ? `&category=${filterCategory}` : "";

    try {
      const res = await fetch(
        `/api/calendar/company-events?startDate=${startDate}&endDate=${endDate}${categoryParam}`,
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterYear]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.json())
      .then((data) => {
        if (data.departments) {
          setDepartments(
            data.departments.map((d: { id: string; name: string }) => ({
              id: d.id,
              name: d.name,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const yearOptions = useMemo(() => {
    const years: string[] = [];
    for (let y = currentYear - 2; y <= currentYear + 3; y++) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  // CRUD handlers
  const openAddDialog = useCallback(() => {
    setEditingEvent(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((event: CompanyEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      titleEn: event.titleEn ?? "",
      startDate: event.startDate,
      endDate: event.endDate,
      category: event.category,
      description: event.description ?? "",
      departmentId: event.departmentId ?? "",
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.startDate || !form.endDate || !form.title.trim()) return;
    setSaving(true);

    const body = {
      title: form.title,
      titleEn: form.titleEn || null,
      startDate: form.startDate,
      endDate: form.endDate,
      category: form.category,
      description: form.description || null,
      departmentId: form.departmentId || null,
    };

    try {
      if (editingEvent) {
        await fetch(`/api/calendar/company-events/${editingEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/calendar/company-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setDialogOpen(false);
      fetchEvents();
    } finally {
      setSaving(false);
    }
  }, [form, editingEvent, fetchEvents]);

  const openDeleteConfirm = useCallback((event: CompanyEvent) => {
    setDeletingEvent(event);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingEvent) return;
    setSaving(true);
    try {
      await fetch(`/api/calendar/company-events/${deletingEvent.id}`, {
        method: "DELETE",
      });
      setDeleteConfirmOpen(false);
      setDeletingEvent(null);
      fetchEvents();
    } finally {
      setSaving(false);
    }
  }, [deletingEvent, fetchEvents]);

  const categoryBadge = useCallback(
    (category: string) => {
      switch (category) {
        case "event":
          return <Badge variant="default">{t.categoryEvent}</Badge>;
        case "deadline":
          return <Badge variant="destructive">{t.categoryDeadline}</Badge>;
        case "period":
          return <Badge variant="secondary">{t.categoryPeriod}</Badge>;
        default:
          return <Badge variant="outline">{category}</Badge>;
      }
    },
    [t],
  );

  const formatDisplayDate = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      if (language === "ja") {
        const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][
          d.getDay()
        ];
        return `${d.getMonth() + 1}月${d.getDate()}日（${dayOfWeek}）`;
      }
      return dateStr.slice(5);
    },
    [language],
  );

  if (loading && events.length === 0) {
    return <CompanyEventsSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.categoryAll}</SelectItem>
            <SelectItem value="event">{t.categoryEvent}</SelectItem>
            <SelectItem value="deadline">{t.categoryDeadline}</SelectItem>
            <SelectItem value="period">{t.categoryPeriod}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {t.totalCount.replace("{count}", String(events.length))}
        </span>

        <div className="flex-1" />

        <Button size="sm" onClick={openAddDialog}>
          {t.addEvent}
        </Button>
      </div>

      {/* Table */}
      {events.length === 0 ? (
        <EmptyState
          message={t.noEvents}
          description={t.noEventsDescription}
          className="border rounded-lg"
        />
      ) : (
        <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 z-10">
                <TableRow>
                  <TableHead className="w-[140px]">{t.startDate}</TableHead>
                  <TableHead className="w-[140px]">{t.endDate}</TableHead>
                  <TableHead>{t.titleLabel}</TableHead>
                  <TableHead className="w-[120px]">{t.department}</TableHead>
                  <TableHead className="w-[120px]">{t.category}</TableHead>
                  <TableHead className="w-[100px] text-right">
                    {t.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDisplayDate(event.startDate)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {event.category === "deadline" || event.startDate === event.endDate
                        ? "—"
                        : formatDisplayDate(event.endDate)}
                    </TableCell>
                    <TableCell>{event.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.departmentName ?? "—"}
                    </TableCell>
                    <TableCell>{categoryBadge(event.category)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(event)}
                        >
                          {t.edit}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteConfirm(event)}
                        >
                          {t.delete}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? t.editEvent : t.addEvent}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">{t.titleLabel}</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-title-en">{t.titleEn}</Label>
              <Input
                id="event-title-en"
                value={form.titleEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, titleEn: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start-date">{t.startDate}</Label>
                <DatePicker
                  value={form.startDate}
                  onChange={(val) =>
                    setForm((f) => ({ ...f, startDate: val }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t.endDate}</Label>
                <DatePicker
                  value={form.endDate}
                  onChange={(val) =>
                    setForm((f) => ({ ...f, endDate: val }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.category}</Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, category: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">{t.categoryEvent}</SelectItem>
                  <SelectItem value="deadline">
                    {t.categoryDeadline}
                  </SelectItem>
                  <SelectItem value="period">{t.categoryPeriod}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.department}</Label>
              <Select
                value={form.departmentId || "__none__"}
                onValueChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    departmentId: val === "__none__" ? "" : val,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t.departmentNone}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">{t.descriptionLabel}</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.startDate ||
                !form.endDate ||
                !form.title.trim()
              }
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.deleteEvent}
        description={t.deleteConfirm}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        disabled={saving}
        onDelete={handleDelete}
        requireConfirmText="DELETE"
        confirmPrompt={t.confirmPrompt}
      />
    </div>
  );
}

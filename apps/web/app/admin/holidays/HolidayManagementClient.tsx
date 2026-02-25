"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { LoadingSpinner } from "@/components/ui/Icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { holidayTranslations, type Language } from "./translations";

interface Holiday {
  id: string;
  date: string;
  name: string;
  nameEn: string | null;
  type: string;
  description: string | null;
}

interface HolidayFormData {
  date: string;
  name: string;
  nameEn: string;
  type: string;
  description: string;
}

const INITIAL_FORM: HolidayFormData = {
  date: "",
  name: "",
  nameEn: "",
  type: "national",
  description: "",
};

interface HolidayManagementClientProps {
  language: Language;
}

export function HolidayManagementClient({
  language,
}: HolidayManagementClientProps) {
  const t = holidayTranslations[language];

  const currentYear = new Date().getFullYear();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterYear, setFilterYear] = useState(String(currentYear));

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [form, setForm] = useState<HolidayFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

  // AI Generate dialog
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateYear, setGenerateYear] = useState(String(currentYear));
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    const year = Number(filterYear);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const typeParam = filterType !== "all" ? `&type=${filterType}` : "&type=all";

    try {
      const res = await fetch(
        `/api/calendar/holidays?startDate=${startDate}&endDate=${endDate}${typeParam}`,
      );
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterType, filterYear]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const yearOptions = useMemo(() => {
    const years: string[] = [];
    for (let y = currentYear - 2; y <= currentYear + 3; y++) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  // CRUD handlers
  const openAddDialog = useCallback(() => {
    setEditingHoliday(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((holiday: Holiday) => {
    setEditingHoliday(holiday);
    setForm({
      date: holiday.date,
      name: holiday.name,
      nameEn: holiday.nameEn ?? "",
      type: holiday.type,
      description: holiday.description ?? "",
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.date || !form.name.trim()) return;
    setSaving(true);

    const body = {
      date: form.date,
      name: form.name,
      nameEn: form.nameEn || null,
      type: form.type,
      description: form.description || null,
    };

    try {
      if (editingHoliday) {
        await fetch(`/api/calendar/holidays/${editingHoliday.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/calendar/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setDialogOpen(false);
      fetchHolidays();
    } finally {
      setSaving(false);
    }
  }, [form, editingHoliday, fetchHolidays]);

  const openDeleteConfirm = useCallback((holiday: Holiday) => {
    setDeletingHoliday(holiday);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingHoliday) return;
    setSaving(true);
    try {
      await fetch(`/api/calendar/holidays/${deletingHoliday.id}`, {
        method: "DELETE",
      });
      setDeleteConfirmOpen(false);
      setDeletingHoliday(null);
      fetchHolidays();
    } finally {
      setSaving(false);
    }
  }, [deletingHoliday, fetchHolidays]);

  // AI Generate
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await fetch("/api/calendar/holidays/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(generateYear) }),
      });
      if (res.ok) {
        const data = await res.json();
        const msg = t.generateSuccess.replace("{count}", String(data.generated));
        setGenerateResult(msg);
        setFilterYear(generateYear);
        fetchHolidays();
      } else {
        setGenerateResult(t.error);
      }
    } catch {
      setGenerateResult(t.error);
    } finally {
      setGenerating(false);
    }
  }, [generateYear, fetchHolidays, t]);

  const typeBadge = useCallback(
    (type: string) => {
      if (type === "national") {
        return <Badge variant="destructive">{t.typeNational}</Badge>;
      }
      return <Badge variant="secondary">{t.typeCompany}</Badge>;
    },
    [t],
  );

  const formatDisplayDate = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      if (language === "ja") {
        return `${d.getMonth() + 1}月${d.getDate()}日`;
      }
      return dateStr.slice(5);
    },
    [language],
  );

  if (loading && holidays.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.typeAll}</SelectItem>
            <SelectItem value="national">{t.typeNational}</SelectItem>
            <SelectItem value="company">{t.typeCompany}</SelectItem>
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
          {t.totalCount.replace("{count}", String(holidays.length))}
        </span>

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
          {t.generateWithAI}
        </Button>
        <Button size="sm" onClick={openAddDialog}>
          {t.addHoliday}
        </Button>
      </div>

      {/* Table */}
      {holidays.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground font-medium">{t.noHolidays}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t.noHolidaysDescription}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t.date}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.nameEn}</TableHead>
                <TableHead className="w-[120px]">{t.type}</TableHead>
                <TableHead className="w-[100px] text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDisplayDate(holiday.date)}
                  </TableCell>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {holiday.nameEn ?? "-"}
                  </TableCell>
                  <TableCell>{typeBadge(holiday.type)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(holiday)}
                      >
                        {t.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openDeleteConfirm(holiday)}
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
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? t.editHoliday : t.addHoliday}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-date">{t.holidayDate}</Label>
              <Input
                id="holiday-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-name">{t.holidayName}</Label>
              <Input
                id="holiday-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-name-en">{t.holidayNameEn}</Label>
              <Input
                id="holiday-name-en"
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.holidayType}</Label>
              <Select
                value={form.type}
                onValueChange={(val) => setForm((f) => ({ ...f, type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">{t.typeNational}</SelectItem>
                  <SelectItem value="company">{t.typeCompany}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-description">{t.holidayDescription}</Label>
              <Textarea
                id="holiday-description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.date || !form.name.trim()}
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.deleteHoliday}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.deleteConfirm}</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={saving}
            >
              {t.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.generateTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.generateDescription}</p>

          <div className="flex items-center gap-2">
            <Select value={generateYear} onValueChange={setGenerateYear}>
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
            <Label>{t.generateYear}</Label>
          </div>

          {generateResult && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {generateResult}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGenerateOpen(false);
                setGenerateResult(null);
              }}
              disabled={generating}
            >
              {t.cancel}
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <LoadingSpinner className="w-4 h-4 mr-1" />}
              {generating ? t.generating : t.generate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

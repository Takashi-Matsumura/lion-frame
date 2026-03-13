"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { kioskManagerTranslations, type Language } from "./translations";

type TabType = "events" | "attendance";

// ─── Types ───

interface KioskEventData {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  category: string;
  status: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  capacity: number | null;
  createdAt: string;
  creator: { name: string | null };
  kioskSession: {
    id: string;
    token: string;
    isActive: boolean;
    expiresAt: string;
    _count: { attendances: number };
  } | null;
}

interface KioskSessionData {
  id: string;
  token: string;
  name: string;
  moduleId: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  creator: { name: string | null };
  _count: { attendances: number };
}

interface AttendanceRecord {
  id: string;
  checkedInAt: string;
  checkedInVia: string;
  employee: {
    employeeId: string;
    name: string;
    position: string;
    profileImage: string | null;
    department: { name: string };
  };
}

// ─── Category config ───

const categoryConfig: Record<string, { color: string; colorDark: string }> = {
  ceremony: {
    color: "bg-rose-100 text-rose-800",
    colorDark: "dark:bg-rose-900 dark:text-rose-200",
  },
  seminar: {
    color: "bg-orange-100 text-orange-800",
    colorDark: "dark:bg-orange-900 dark:text-orange-200",
  },
  meeting: {
    color: "bg-blue-100 text-blue-800",
    colorDark: "dark:bg-blue-900 dark:text-blue-200",
  },
  training: {
    color: "bg-green-100 text-green-800",
    colorDark: "dark:bg-green-900 dark:text-green-200",
  },
  health_check: {
    color: "bg-purple-100 text-purple-800",
    colorDark: "dark:bg-purple-900 dark:text-purple-200",
  },
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-muted text-muted-foreground",
};

// ─── Main Component ───

export function KioskManagerClient({ language }: { language: Language }) {
  const t = kioskManagerTranslations[language];
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabType) || "events";

  // Events state
  const [events, setEvents] = useState<KioskEventData[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<KioskEventData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KioskEventData | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const copiedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Event form state
  const [eventForm, setEventForm] = useState({
    name: "",
    nameEn: "",
    description: "",
    category: "meeting",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    capacity: "",
  });

  // Sessions state (出席記録タブ用)
  const [sessions, setSessions] = useState<KioskSessionData[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Attendance state
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // ─── Category / Status label helpers ───

  const getCategoryLabel = useCallback(
    (cat: string) => {
      const map: Record<string, string> = {
        ceremony: t.categoryCeremony,
        seminar: t.categorySeminar,
        meeting: t.categoryMeeting,
        training: t.categoryTraining,
        health_check: t.categoryHealthCheck,
      };
      return map[cat] || cat;
    },
    [t],
  );

  const getStatusLabel = useCallback(
    (status: string) => {
      const map: Record<string, string> = {
        draft: t.statusDraft,
        published: t.statusPublished,
        closed: t.statusClosed,
      };
      return map[status] || status;
    },
    [t],
  );

  // ─── Events fetch / CRUD ───

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/kiosk/events/manage${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
      }
    } finally {
      setIsLoadingEvents(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === "events") fetchEvents();
  }, [activeTab, fetchEvents]);

  const openCreateEvent = useCallback(() => {
    setEditingEvent(null);
    setEventForm({
      name: "",
      nameEn: "",
      description: "",
      category: "meeting",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      capacity: "",
    });
    setEventDialogOpen(true);
  }, []);

  const openEditEvent = useCallback((event: KioskEventData) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      nameEn: event.nameEn || "",
      description: event.description || "",
      category: event.category,
      date: event.date.slice(0, 10),
      startTime: event.startTime ? event.startTime.slice(0, 16) : "",
      endTime: event.endTime ? event.endTime.slice(0, 16) : "",
      location: event.location || "",
      capacity: event.capacity?.toString() || "",
    });
    setEventDialogOpen(true);
  }, []);

  const handleSaveEvent = useCallback(async () => {
    if (!eventForm.name.trim() || !eventForm.date) return;
    setIsSavingEvent(true);
    try {
      const url = editingEvent
        ? `/api/kiosk/events/manage/${editingEvent.id}`
        : "/api/kiosk/events/manage";
      const method = editingEvent ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      });

      if (res.ok) {
        toast.success(
          editingEvent ? t.eventUpdateSuccess : t.eventCreateSuccess,
        );
        setEventDialogOpen(false);
        fetchEvents();
      } else {
        toast.error(t.eventCreateError);
      }
    } finally {
      setIsSavingEvent(false);
    }
  }, [eventForm, editingEvent, t, fetchEvents]);

  const handleDeleteEvent = useCallback(async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/kiosk/events/manage/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success(t.eventDeleteSuccess);
      setDeleteTarget(null);
      fetchEvents();
    }
  }, [deleteTarget, t, fetchEvents]);

  const handleGenerateKiosk = useCallback(
    async (eventId: string) => {
      const res = await fetch(`/api/kiosk/events/manage/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_kiosk" }),
      });
      if (res.ok) {
        toast.success(t.kioskGenerated);
        fetchEvents();
      }
    },
    [t, fetchEvents],
  );

  const handleCopyKioskUrl = useCallback(
    (token: string) => {
      const url = `${window.location.origin}/kiosk/events/${token}`;
      navigator.clipboard.writeText(url);
      toast.success(t.copied);
      setCopiedTokenId(token);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedTokenId(null), 2000);
    },
    [t],
  );

  const handlePublishEvent = useCallback(
    async (eventId: string) => {
      const res = await fetch(`/api/kiosk/events/manage/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (res.ok) {
        toast.success(t.publishSuccess);
        fetchEvents();
      }
    },
    [t, fetchEvents],
  );

  // ─── Sessions fetch / CRUD ───

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch("/api/kiosk/sessions?moduleId=event-attendance");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "attendance") fetchSessions();
  }, [activeTab, fetchSessions]);

  // ─── Attendance fetch ───

  const fetchAttendance = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setIsLoadingAttendance(true);
    try {
      const res = await fetch(`/api/kiosk/attendance?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setAttendances(data.attendances);
      }
    } finally {
      setIsLoadingAttendance(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchAttendance(selectedSessionId);
    }
  }, [selectedSessionId, fetchAttendance]);

  // ─── Date formatting helper ───

  const formatDate = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
        year: "numeric",
        month: language === "ja" ? "long" : "short",
        day: "numeric",
      });
    },
    [language],
  );

  // ─── Render ───

  return (
    <div className="max-w-7xl mx-auto mt-8">
      {/* ────── Events Tab ────── */}
      {activeTab === "events" && (
        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {t.eventList}
              </h2>
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.statusAll}</SelectItem>
                    <SelectItem value="draft">{t.statusDraft}</SelectItem>
                    <SelectItem value="published">
                      {t.statusPublished}
                    </SelectItem>
                    <SelectItem value="closed">{t.statusClosed}</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={openCreateEvent}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t.createEvent}
                </Button>
              </div>
            </div>

            {/* Table */}
            {isLoadingEvents ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={`ev-skel-${i}`} className="h-12 w-full" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                message={t.noEvents}
                description={t.noEventsDescription}
                action={
                  <Button onClick={openCreateEvent} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.createEvent}
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.eventName}</TableHead>
                    <TableHead>{t.eventCategory}</TableHead>
                    <TableHead>{t.eventStatus}</TableHead>
                    <TableHead>{t.eventDate}</TableHead>
                    <TableHead>{t.eventLocation}</TableHead>
                    <TableHead className="text-right">
                      {t.attendeeCount}
                    </TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const catCfg = categoryConfig[event.category] || {
                      color: "bg-muted text-muted-foreground",
                      colorDark: "",
                    };
                    return (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {event.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${catCfg.color} ${catCfg.colorDark}`}
                          >
                            {getCategoryLabel(event.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[event.status] || ""}>
                            {getStatusLabel(event.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(event.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.location || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {event.kioskSession?._count.attendances ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {event.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePublishEvent(event.id)}
                                title={t.publish}
                              >
                                {t.publish}
                              </Button>
                            )}
                            {event.kioskSession ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${copiedTokenId === event.kioskSession.token ? "text-green-600 dark:text-green-400" : ""}`}
                                onClick={() =>
                                  handleCopyKioskUrl(
                                    event.kioskSession!.token,
                                  )
                                }
                                title={copiedTokenId === event.kioskSession.token ? t.copied : t.copyUrl}
                              >
                                {copiedTokenId === event.kioskSession.token ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Link2 className="w-4 h-4" />
                                )}
                              </Button>
                            ) : (
                              event.status === "published" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleGenerateKiosk(event.id)
                                  }
                                  title={t.generateKiosk}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                    />
                                  </svg>
                                </Button>
                              )
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditEvent(event)}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(event)}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ────── Attendance Tab ────── */}
      {activeTab === "attendance" && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder={t.selectSession} />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s._count.attendances} {t.attendees})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSessionId && (
                <Badge className="bg-primary text-primary-foreground">
                  {t.totalAttendees}:{" "}
                  {sessions.find((s) => s.id === selectedSessionId)?._count
                    .attendances || 0}
                </Badge>
              )}
            </div>

            {!selectedSessionId ? (
              <EmptyState message={t.selectSession} />
            ) : isLoadingAttendance ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={`att-skel-${i}`} className="h-12 w-full" />
                ))}
              </div>
            ) : attendances.length === 0 ? (
              <EmptyState message={t.noAttendance} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.employeeName}</TableHead>
                    <TableHead>{t.employeeId}</TableHead>
                    <TableHead>{t.department}</TableHead>
                    <TableHead>{t.checkedInAt}</TableHead>
                    <TableHead>{t.checkedInVia}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.employee.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.employee.employeeId}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.employee.department.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(a.checkedInAt).toLocaleString(
                          language === "ja" ? "ja-JP" : "en-US",
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            a.checkedInVia === "nfc"
                              ? "border-blue-500 text-blue-700 dark:text-blue-300"
                              : ""
                          }
                        >
                          {a.checkedInVia === "nfc" ? t.nfc : t.manual}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ────── Event Create/Edit Dialog ────── */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? t.editEvent : t.createEvent}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEvent();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="event-name">
                {t.eventName} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="event-name"
                value={eventForm.name}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-name-en">{t.eventNameEn}</Label>
              <Input
                id="event-name-en"
                value={eventForm.nameEn}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, nameEn: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-desc">{t.eventDescription}</Label>
              <textarea
                id="event-desc"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm resize-y min-h-[80px]"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t.eventCategory} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={eventForm.category}
                onValueChange={(v) =>
                  setEventForm((f) => ({ ...f, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ceremony">
                    {t.categoryCeremony}
                  </SelectItem>
                  <SelectItem value="seminar">{t.categorySeminar}</SelectItem>
                  <SelectItem value="meeting">{t.categoryMeeting}</SelectItem>
                  <SelectItem value="training">
                    {t.categoryTraining}
                  </SelectItem>
                  <SelectItem value="health_check">
                    {t.categoryHealthCheck}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-date">
                {t.eventDate} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="event-date"
                type="date"
                value={eventForm.date}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">{t.eventStartTime}</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={eventForm.startTime}
                  onChange={(e) =>
                    setEventForm((f) => ({
                      ...f,
                      startTime: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">{t.eventEndTime}</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={eventForm.endTime}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, endTime: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">{t.eventLocation}</Label>
              <Input
                id="event-location"
                value={eventForm.location}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-capacity">{t.eventCapacity}</Label>
              <Input
                id="event-capacity"
                type="number"
                className="max-w-[150px]"
                value={eventForm.capacity}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, capacity: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEventDialogOpen(false)}
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                disabled={
                  isSavingEvent ||
                  !eventForm.name.trim() ||
                  !eventForm.date
                }
                loading={isSavingEvent}
              >
                {isSavingEvent ? t.saving : t.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ────── Delete Confirm Dialog ────── */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t.delete}
        description={t.eventDeleteConfirm}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

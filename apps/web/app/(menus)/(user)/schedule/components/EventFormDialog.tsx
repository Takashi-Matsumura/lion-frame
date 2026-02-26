import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type CalendarEvent,
  type EventFormData,
  type Translations,
  CATEGORY_COLORS,
} from "./calendar-types";

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: CalendarEvent | null;
  form: EventFormData;
  saving: boolean;
  deleteConfirmOpen: boolean;
  onDeleteConfirmChange: (open: boolean) => void;
  translations: Translations;
  onFormChange: (form: EventFormData) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function EventFormDialog({
  open,
  onOpenChange,
  editingEvent,
  form,
  saving,
  deleteConfirmOpen,
  onDeleteConfirmChange,
  translations: t,
  onFormChange,
  onSave,
  onDelete,
}: EventFormDialogProps) {
  const categoryLabel = useCallback(
    (cat: string) => {
      const map: Record<string, string> = {
        personal: t.categoryPersonal,
        work: t.categoryWork,
        meeting: t.categoryMeeting,
        visitor: t.categoryVisitor,
        trip: t.categoryTrip,
        other: t.categoryOther,
      };
      return map[cat] ?? cat;
    },
    [t],
  );

  const updateField = useCallback(
    <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => {
      onFormChange({ ...form, [key]: value });
    },
    [form, onFormChange],
  );

  return (
    <>
      {/* Add/Edit Event Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? t.editEvent : t.addEvent}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">{t.eventTitle}</Label>
              <Input
                id="event-title"
                placeholder={t.eventTitlePlaceholder}
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">{t.eventDescription}</Label>
              <Textarea
                id="event-description"
                placeholder={t.eventDescriptionPlaceholder}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">{t.eventLocation}</Label>
              <Input
                id="event-location"
                placeholder={t.eventLocationPlaceholder}
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="event-allday"
                checked={form.allDay}
                onCheckedChange={(checked) => updateField("allDay", checked)}
              />
              <Label htmlFor="event-allday">{t.allDay}</Label>
            </div>

            {!form.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-start">{t.startDateTime}</Label>
                  <Input
                    id="event-start"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => updateField("startTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end">{t.endDateTime}</Label>
                  <Input
                    id="event-end"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => updateField("endTime", e.target.value)}
                  />
                </div>
              </div>
            )}

            {form.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-start-date">{t.startDateTime}</Label>
                  <Input
                    id="event-start-date"
                    type="date"
                    value={form.startTime.split("T")[0]}
                    onChange={(e) =>
                      onFormChange({
                        ...form,
                        startTime: `${e.target.value}T00:00`,
                        endTime: `${e.target.value}T23:59`,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end-date">{t.endDateTime}</Label>
                  <Input
                    id="event-end-date"
                    type="date"
                    value={form.endTime.split("T")[0]}
                    onChange={(e) =>
                      onFormChange({
                        ...form,
                        endTime: `${e.target.value}T23:59`,
                      })
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t.category}</Label>
              <Select
                value={form.category}
                onValueChange={(val) => updateField("category", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "work",
                      "meeting",
                      "visitor",
                      "trip",
                      "personal",
                      "other",
                    ] as const
                  ).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${CATEGORY_COLORS[cat]}`}
                        />
                        {categoryLabel(cat)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            {editingEvent && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteConfirmChange(true)}
                disabled={saving}
              >
                {t.delete}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t.cancel}
            </Button>
            <Button onClick={onSave} disabled={saving || !form.title.trim()}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={onDeleteConfirmChange}
        title={t.deleteEvent}
        description={t.deleteConfirm}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        disabled={saving}
        onDelete={onDelete}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card, CardContent, CardHeader, CardTitle, DeleteConfirmDialog } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  ChevronDown,
  ListFilter,
  CircleDot,
  CheckSquare,
  Star,
  User,
  Building2,
  Heading,
  List,
  ToggleLeft,
} from "lucide-react";
import {
  useFormBuilderStore,
  type FormFieldDraft,
  type FormSectionDraft,
} from "@/lib/addon-modules/forms/form-builder-store";
import { SectionConditionalLogicEditor } from "@/components/business/forms/ConditionalLogicEditor";
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";

const fieldTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  TEXT: Type,
  TEXTAREA: AlignLeft,
  NUMBER: Hash,
  DATE: Calendar,
  SELECT: ChevronDown,
  MULTI_SELECT: ListFilter,
  RADIO: CircleDot,
  CHECKBOX_GROUP: CheckSquare,
  RATING: Star,
  EMPLOYEE_PICKER: User,
  DEPARTMENT_PICKER: Building2,
  SECTION_HEADER: Heading,
  YES_NO: ToggleLeft,
};

function SortableField({
  field,
  index,
  language,
  onRequestDelete,
  onRequestDuplicate,
}: {
  field: FormFieldDraft;
  index: number;
  language: Language;
  onRequestDelete: (fieldId: string) => void;
  onRequestDuplicate: (fieldId: string) => void;
}) {
  const { selectedFieldId, selectField } = useFormBuilderStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedFieldId === field.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/30"
      }`}
      onClick={() => selectField(field.id)}
    >
      <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
        {index + 1}
      </span>
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors text-base leading-none"
      >
        ⋮⋮
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {(() => {
            const Icon = fieldTypeIcon[field.type] ?? List;
            return (
              <span className="w-5 h-5 flex items-center justify-center bg-muted rounded shrink-0">
                <Icon className="size-3" />
              </span>
            );
          })()}
          <span className="text-sm truncate">
            {field.labelJa || field.label || "(未設定)"}
          </span>
          {field.required && (
            <span className="text-destructive text-xs">*</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-sm"
        onClick={(e) => {
          e.stopPropagation();
          onRequestDuplicate(field.id);
        }}
        title={formBuilderTranslations[language].duplicateField}
      >
        ⧉
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:text-destructive text-sm"
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete(field.id);
        }}
      >
        x
      </button>
    </div>
  );
}

function SortableSectionBlock({
  section,
  language,
  onRequestDeleteField,
  onRequestDeleteSection,
  onRequestDuplicateField,
}: {
  section: FormSectionDraft;
  language: Language;
  onRequestDeleteField: (fieldId: string) => void;
  onRequestDeleteSection: (sectionId: string) => void;
  onRequestDuplicateField: (fieldId: string) => void;
}) {
  const t = formBuilderTranslations[language];
  const { reorderField, updateSection, form, selectField } = useFormBuilderStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `section_${section.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fieldSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = section.fields.findIndex((f) => f.id === active.id);
    const toIndex = section.fields.findIndex((f) => f.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderField(section.id, fromIndex, toIndex);
    }
  };

  const canRemove = (form?.sections.length ?? 0) > 1;

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader className="pb-3" onClick={() => selectField(null)}>
          <div className="flex items-center gap-2">
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors text-sm leading-none shrink-0"
              title={t.dragSection}
            >
              ⋮⋮
            </span>
            <div className="flex-1 min-w-0 space-y-1">
              <Input
                value={section.titleJa ?? section.title ?? ""}
                onChange={(e) =>
                  updateSection(section.id, { title: e.target.value, titleJa: e.target.value })
                }
                placeholder={t.sectionTitle}
                className="text-sm font-medium border-0 p-0 h-auto bg-transparent shadow-none focus-visible:ring-0"
              />
              <Input
                value={section.description ?? ""}
                onChange={(e) =>
                  updateSection(section.id, { description: e.target.value })
                }
                placeholder={t.sectionDescription}
                className="text-xs border-0 p-0 h-auto bg-transparent shadow-none focus-visible:ring-0 text-muted-foreground"
              />
            </div>
            {canRemove ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onRequestDeleteSection(section.id)}
              >
                x
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground shrink-0"
                      disabled
                    >
                      x
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t.sectionMinimum}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <DndContext
            sensors={fieldSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFieldDragEnd}
          >
            <SortableContext
              items={section.fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.fields.map((field, idx) => (
                <SortableField
                  key={field.id}
                  field={field}
                  index={idx}
                  language={language}
                  onRequestDelete={onRequestDeleteField}
                  onRequestDuplicate={onRequestDuplicateField}
                />
              ))}
            </SortableContext>
          </DndContext>

          {section.fields.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t.addField}
            </p>
          )}

          {/* セクション条件ロジック（2番目以降のセクションのみ） */}
          {(form?.sections.findIndex((s) => s.id === section.id) ?? 0) > 0 && (
            <SectionConditionalLogicEditor section={section} language={language} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function FormCanvas({ language, readOnly = false }: { language: Language; readOnly?: boolean }) {
  const t = formBuilderTranslations[language];
  const { form, updateFormMeta, addSection, removeField, removeSection, reorderSection, duplicateField, selectField } =
    useFormBuilderStore();

  // Delete confirmation state
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<string | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<string | null>(null);

  // Section DnD
  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sections = form?.sections ?? [];
    const fromIndex = sections.findIndex((s) => `section_${s.id}` === active.id);
    const toIndex = sections.findIndex((s) => `section_${s.id}` === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderSection(fromIndex, toIndex);
    }
  };

  const handleRequestDeleteSection = (sectionId: string) => {
    const section = form?.sections.find((s) => s.id === sectionId);
    if (section && section.fields.length > 0) {
      setDeleteSectionTarget(sectionId);
    } else {
      removeSection(sectionId);
    }
  };

  if (!form) return null;

  // ─── Read-only view (PUBLISHED / CLOSED) ───
  if (readOnly) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <h3 className="font-semibold">{form.titleJa || form.title}</h3>
            {form.description && (
              <p className="text-sm text-muted-foreground">{form.descriptionJa || form.description}</p>
            )}
          </CardContent>
        </Card>
        {form.sections.map((section) => (
          <Card key={section.id}>
            {(section.titleJa || section.title) && (
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{section.titleJa || section.title}</CardTitle>
                {section.description && (
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                )}
              </CardHeader>
            )}
            <CardContent className="space-y-2">
              {section.fields.map((field, idx) => {
                const Icon = fieldTypeIcon[field.type] ?? List;
                return (
                  <div key={field.id} className="flex items-center gap-2 p-3 rounded-md border border-border">
                    <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{idx + 1}</span>
                    <span className="w-5 h-5 flex items-center justify-center bg-muted rounded shrink-0">
                      <Icon className="size-3" />
                    </span>
                    <span className="text-sm">{field.labelJa || field.label || "(未設定)"}</span>
                    {field.required && <span className="text-destructive text-xs">*</span>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ─── Editable view (DRAFT) ───
  return (
    <div className="space-y-4">
      {/* Form meta */}
      <Card onClick={() => selectField(null)}>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label className="text-xs">{t.formTitleLabel}</Label>
            <Input
              value={form.title}
              onChange={(e) => updateFormMeta({ title: e.target.value, titleJa: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">{t.formDescription}</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => updateFormMeta({ description: e.target.value, descriptionJa: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.allowMultiple}
              onCheckedChange={(v) => updateFormMeta({ allowMultiple: v })}
            />
            <Label className="text-xs">{t.allowMultiple}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Sections with DnD */}
      <DndContext
        sensors={sectionSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={form.sections.map((s) => `section_${s.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {form.sections.map((section) => (
            <SortableSectionBlock
              key={section.id}
              section={section}
              language={language}
              onRequestDeleteField={setDeleteFieldTarget}
              onRequestDeleteSection={handleRequestDeleteSection}
              onRequestDuplicateField={duplicateField}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button variant="outline" className="w-full" onClick={addSection}>
        {t.addSection}
      </Button>

      {/* Field delete confirmation */}
      <DeleteConfirmDialog
        open={!!deleteFieldTarget}
        onOpenChange={(open) => !open && setDeleteFieldTarget(null)}
        onDelete={() => {
          if (deleteFieldTarget) {
            removeField(deleteFieldTarget);
            setDeleteFieldTarget(null);
          }
        }}
        title={t.deleteFieldTitle}
        description={t.deleteFieldDescription}
      />

      {/* Section delete confirmation */}
      <DeleteConfirmDialog
        open={!!deleteSectionTarget}
        onOpenChange={(open) => !open && setDeleteSectionTarget(null)}
        onDelete={() => {
          if (deleteSectionTarget) {
            removeSection(deleteSectionTarget);
            setDeleteSectionTarget(null);
          }
        }}
        title={t.deleteSectionTitle}
        description={t.deleteSectionDescription}
      />
    </div>
  );
}

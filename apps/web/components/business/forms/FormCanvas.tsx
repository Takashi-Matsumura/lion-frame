"use client";

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
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useFormBuilderStore,
  type FormFieldDraft,
  type FormSectionDraft,
} from "@/lib/addon-modules/forms/form-builder-store";
import { formBuilderTranslations, type Language } from "@/app/(menus)/(manager)/form-builder/translations";

function SortableField({
  field,
  language,
}: {
  field: FormFieldDraft;
  language: Language;
}) {
  const { selectedFieldId, selectField, removeField } =
    useFormBuilderStore();
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
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        &#x2630;
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
            {field.type}
          </span>
          <span className="text-sm truncate">
            {(language === "ja" && field.labelJa) || field.label || "(untitled)"}
          </span>
          {field.required && (
            <span className="text-destructive text-xs">*</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="text-muted-foreground hover:text-destructive text-sm"
        onClick={(e) => {
          e.stopPropagation();
          removeField(field.id);
        }}
      >
        x
      </button>
    </div>
  );
}

function SectionBlock({
  section,
  language,
}: {
  section: FormSectionDraft;
  language: Language;
}) {
  const t = formBuilderTranslations[language];
  const { reorderField, updateSection, removeSection, form } =
    useFormBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Input
            value={(language === "ja" ? section.titleJa : section.title) ?? ""}
            onChange={(e) =>
              updateSection(section.id, language === "ja" ? { titleJa: e.target.value } : { title: e.target.value })
            }
            placeholder={t.sectionTitle}
            className="text-sm font-medium border-0 p-0 h-auto bg-transparent shadow-none focus-visible:ring-0"
          />
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeSection(section.id)}
            >
              x
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={section.fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {section.fields.map((field) => (
              <SortableField key={field.id} field={field} language={language} />
            ))}
          </SortableContext>
        </DndContext>

        {section.fields.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t.addField}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function FormCanvas({ language }: { language: Language }) {
  const t = formBuilderTranslations[language];
  const { form, updateFormMeta, addSection } = useFormBuilderStore();

  if (!form) return null;

  return (
    <div className="space-y-4">
      {/* Form meta */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label className="text-xs">{t.formTitleLabel}</Label>
            <Input
              value={form.title}
              onChange={(e) => updateFormMeta({ title: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">{t.formTitleJa}</Label>
            <Input
              value={form.titleJa ?? ""}
              onChange={(e) => updateFormMeta({ titleJa: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">{t.formDescription}</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => updateFormMeta({ description: e.target.value })}
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

      {/* Sections */}
      {form.sections.map((section) => (
        <SectionBlock key={section.id} section={section} language={language} />
      ))}

      <Button variant="outline" className="w-full" onClick={addSection}>
        {t.addSection}
      </Button>
    </div>
  );
}

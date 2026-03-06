import type { FieldType } from "@prisma/client";
import { create } from "zustand";

export interface FormFieldDraft {
  id: string;
  type: FieldType;
  label: string;
  labelJa?: string;
  placeholder?: string;
  required: boolean;
  order: number;
  config: Record<string, unknown>;
  conditionalLogic?: {
    action: "show" | "hide";
    logic: "and" | "or";
    conditions: {
      fieldId: string;
      operator: string;
      value?: unknown;
    }[];
  } | null;
}

export interface FormSectionDraft {
  id: string;
  title?: string;
  titleJa?: string;
  description?: string;
  order: number;
  fields: FormFieldDraft[];
}

export interface FormDraft {
  id?: string;
  title: string;
  titleJa?: string;
  description?: string;
  descriptionJa?: string;
  status: string;
  allowMultiple: boolean;
  settings: Record<string, unknown>;
  sections: FormSectionDraft[];
}

let tempIdCounter = 0;
function tempId() {
  return `temp_${Date.now()}_${++tempIdCounter}`;
}

function defaultField(type: FieldType, order: number): FormFieldDraft {
  return {
    id: tempId(),
    type,
    label: type === "SECTION_HEADER" ? "Section" : "",
    required: false,
    order,
    config: {},
    conditionalLogic: null,
  };
}

interface FormBuilderStore {
  form: FormDraft | null;
  selectedFieldId: string | null;
  isDirty: boolean;

  setForm: (form: FormDraft) => void;
  selectField: (id: string | null) => void;
  updateFormMeta: (updates: Partial<Pick<FormDraft, "title" | "titleJa" | "description" | "descriptionJa" | "allowMultiple" | "settings">>) => void;

  addField: (sectionId: string, type: FieldType) => void;
  updateField: (fieldId: string, updates: Partial<FormFieldDraft>) => void;
  removeField: (fieldId: string) => void;
  reorderField: (sectionId: string, fromIndex: number, toIndex: number) => void;

  addSection: () => void;
  updateSection: (sectionId: string, updates: Partial<Pick<FormSectionDraft, "title" | "titleJa" | "description">>) => void;
  removeSection: (sectionId: string) => void;

  markSaved: () => void;
}

export const useFormBuilderStore = create<FormBuilderStore>((set) => ({
  form: null,
  selectedFieldId: null,
  isDirty: false,

  setForm: (form) => set({ form, isDirty: false, selectedFieldId: null }),

  selectField: (id) => set({ selectedFieldId: id }),

  updateFormMeta: (updates) =>
    set((state) => {
      if (!state.form) return state;
      return { form: { ...state.form, ...updates }, isDirty: true };
    }),

  addField: (sectionId, type) =>
    set((state) => {
      if (!state.form) return state;
      const sections = state.form.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const field = defaultField(type, s.fields.length);
        return { ...s, fields: [...s.fields, field] };
      });
      const newField = sections.find((s) => s.id === sectionId)?.fields.at(-1);
      return {
        form: { ...state.form, sections },
        isDirty: true,
        selectedFieldId: newField?.id ?? state.selectedFieldId,
      };
    }),

  updateField: (fieldId, updates) =>
    set((state) => {
      if (!state.form) return state;
      const sections = state.form.sections.map((s) => ({
        ...s,
        fields: s.fields.map((f) =>
          f.id === fieldId ? { ...f, ...updates } : f,
        ),
      }));
      return { form: { ...state.form, sections }, isDirty: true };
    }),

  removeField: (fieldId) =>
    set((state) => {
      if (!state.form) return state;
      const sections = state.form.sections.map((s) => ({
        ...s,
        fields: s.fields
          .filter((f) => f.id !== fieldId)
          .map((f, i) => ({ ...f, order: i })),
      }));
      return {
        form: { ...state.form, sections },
        isDirty: true,
        selectedFieldId:
          state.selectedFieldId === fieldId ? null : state.selectedFieldId,
      };
    }),

  reorderField: (sectionId, fromIndex, toIndex) =>
    set((state) => {
      if (!state.form) return state;
      const sections = state.form.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const fields = [...s.fields];
        const [moved] = fields.splice(fromIndex, 1);
        fields.splice(toIndex, 0, moved);
        return { ...s, fields: fields.map((f, i) => ({ ...f, order: i })) };
      });
      return { form: { ...state.form, sections }, isDirty: true };
    }),

  addSection: () =>
    set((state) => {
      if (!state.form) return state;
      const section: FormSectionDraft = {
        id: tempId(),
        order: state.form.sections.length,
        fields: [],
      };
      return {
        form: { ...state.form, sections: [...state.form.sections, section] },
        isDirty: true,
      };
    }),

  updateSection: (sectionId, updates) =>
    set((state) => {
      if (!state.form) return state;
      const sections = state.form.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s,
      );
      return { form: { ...state.form, sections }, isDirty: true };
    }),

  removeSection: (sectionId) =>
    set((state) => {
      if (!state.form) return state;
      const sections = state.form.sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i }));
      return { form: { ...state.form, sections }, isDirty: true };
    }),

  markSaved: () => set({ isDirty: false }),
}));

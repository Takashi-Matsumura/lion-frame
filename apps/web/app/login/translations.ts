export const loginTranslations = {
  en: {
    or: "OR",
    systemUpdateMessage: "The system has been updated. Please sign in again.",
  },
  ja: {
    or: "または",
    systemUpdateMessage: "システムが更新されました。再度ログインしてください。",
  },
} as const;

export type LoginTranslationKey = keyof typeof loginTranslations.en;

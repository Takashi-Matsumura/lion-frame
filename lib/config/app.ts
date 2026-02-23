/**
 * Application configuration
 *
 * These values can be customized via environment variables
 * for derived projects that use LionFrame as a base.
 */
export const appConfig = {
  /** Application name displayed in header, sidebar, and browser title */
  name: process.env.NEXT_PUBLIC_APP_NAME || "LionFrame",

  /** Application description displayed in dashboard and metadata */
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    "Modular framework for back-office operations",

  /** Japanese description for i18n support */
  descriptionJa:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION_JA ||
    "バックオフィス業務を支援するモジュラーフレームワーク",
} as const;

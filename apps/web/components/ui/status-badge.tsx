"use client";

import { FileEdit, Globe, Building2, Archive, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type DocStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type DocVisibility = "PRIVATE" | "DEPARTMENT" | "ORGANIZATION";

interface StatusConfig {
  label: string;
  labelJa: string;
  icon: typeof FileEdit;
  bg: string;
  text: string;
  dark: string;
  border?: string;
}

/**
 * status + visibility の組み合わせからバッジ設定を取得
 */
function getStatusConfig(status: DocStatus, visibility: DocVisibility): StatusConfig {
  if (status === "ARCHIVED") {
    return {
      label: "Archived",
      labelJa: "アーカイブ",
      icon: Archive,
      bg: "bg-gray-100/60",
      text: "text-gray-400",
      dark: "dark:bg-gray-800/30 dark:text-gray-500",
    };
  }

  if (status === "DRAFT") {
    if (visibility === "DEPARTMENT") {
      return {
        label: "Draft (Dept)",
        labelJa: "下書き",
        icon: FileEdit,
        bg: "bg-gray-100",
        text: "text-gray-600",
        dark: "dark:bg-gray-800/50 dark:text-gray-400",
        border: "ring-1 ring-blue-300 dark:ring-blue-700",
      };
    }
    if (visibility === "ORGANIZATION") {
      return {
        label: "Draft (Org)",
        labelJa: "下書き",
        icon: FileEdit,
        bg: "bg-gray-100",
        text: "text-gray-600",
        dark: "dark:bg-gray-800/50 dark:text-gray-400",
        border: "ring-1 ring-green-300 dark:ring-green-700",
      };
    }
    return {
      label: "Draft",
      labelJa: "下書き",
      icon: FileEdit,
      bg: "bg-gray-100",
      text: "text-gray-600",
      dark: "dark:bg-gray-800/50 dark:text-gray-400",
    };
  }

  // PUBLISHED
  if (visibility === "ORGANIZATION") {
    return {
      label: "Public",
      labelJa: "全社公開",
      icon: Globe,
      bg: "bg-green-100",
      text: "text-green-700",
      dark: "dark:bg-green-900/40 dark:text-green-300",
    };
  }

  // PUBLISHED + DEPARTMENT (or PRIVATE fallback)
  return {
    label: "Dept",
    labelJa: "部署内",
    icon: Building2,
    bg: "bg-blue-100",
    text: "text-blue-700",
    dark: "dark:bg-blue-900/40 dark:text-blue-300",
  };
}

export interface StatusBadgeProps {
  status: DocStatus;
  visibility: DocVisibility;
  language?: "en" | "ja";
  size?: "sm" | "md";
  className?: string;
}

/**
 * ステータスバッジ — タグバッジとは視覚的に区別
 * タグ:   [# 人事]        → # プレフィックス、角丸四角
 * バッジ: [📝 下書き]      → アイコンプレフィックス、ピル型（rounded-full）
 */
export function StatusBadge({
  status,
  visibility,
  language = "ja",
  size = "sm",
  className,
}: StatusBadgeProps) {
  const config = getStatusConfig(status, visibility);
  const Icon = config.icon;
  const label = language === "ja" ? config.labelJa : config.label;

  const sizeClasses = size === "sm"
    ? "text-[11px] px-2 py-0.5 gap-1"
    : "text-xs px-2.5 py-0.5 gap-1";

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  // 公開範囲の補足（DRAFTで公開先が設定されている場合のみ）
  const scopeHint = status === "DRAFT" && visibility === "DEPARTMENT"
    ? (language === "ja" ? "→部署" : "→Dept")
    : status === "DRAFT" && visibility === "ORGANIZATION"
      ? (language === "ja" ? "→全社" : "→Org")
      : null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap shrink-0",
        config.bg,
        config.text,
        config.dark,
        config.border,
        sizeClasses,
        className,
      )}
    >
      <Icon className={iconSize} />
      {label}
      {scopeHint && (
        <span className="opacity-50 text-[10px]">{scopeHint}</span>
      )}
    </span>
  );
}

/** 読み取り専用バッジ（他ユーザの公開ドキュメント用） */
export function ReadOnlyBadge({ language = "ja", className }: { language?: "en" | "ja"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap shrink-0",
        "text-[11px] px-2 py-0.5 gap-1",
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        className,
      )}
    >
      <Eye className="h-3 w-3" />
      {language === "ja" ? "閲覧のみ" : "Read only"}
    </span>
  );
}

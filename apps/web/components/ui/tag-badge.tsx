"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const TAG_COLOR_CLASSES: Record<string, { bg: string; text: string; dark: string }> = {
  blue:   { bg: "bg-blue-100",   text: "text-blue-800",   dark: "dark:bg-blue-900/40 dark:text-blue-300" },
  green:  { bg: "bg-green-100",  text: "text-green-800",  dark: "dark:bg-green-900/40 dark:text-green-300" },
  red:    { bg: "bg-red-100",    text: "text-red-800",    dark: "dark:bg-red-900/40 dark:text-red-300" },
  purple: { bg: "bg-purple-100", text: "text-purple-800", dark: "dark:bg-purple-900/40 dark:text-purple-300" },
  orange: { bg: "bg-orange-100", text: "text-orange-800", dark: "dark:bg-orange-900/40 dark:text-orange-300" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-800", dark: "dark:bg-yellow-900/40 dark:text-yellow-300" },
  pink:   { bg: "bg-pink-100",   text: "text-pink-800",   dark: "dark:bg-pink-900/40 dark:text-pink-300" },
  cyan:   { bg: "bg-cyan-100",   text: "text-cyan-800",   dark: "dark:bg-cyan-900/40 dark:text-cyan-300" },
  gray:   { bg: "bg-gray-100",   text: "text-gray-700",   dark: "dark:bg-gray-800/60 dark:text-gray-300" },
};

export interface TagBadgeProps {
  name: string;
  color?: string;
  isUserTag?: boolean;
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function TagBadge({
  name,
  color = "gray",
  isUserTag = false,
  size = "sm",
  removable = false,
  onRemove,
  onClick,
  className,
}: TagBadgeProps) {
  const colors = isUserTag
    ? TAG_COLOR_CLASSES.gray
    : (TAG_COLOR_CLASSES[color] ?? TAG_COLOR_CLASSES.gray);

  const sizeClasses = size === "sm"
    ? "text-[11px] px-1.5 py-0.5 gap-0.5"
    : "text-xs px-2 py-0.5 gap-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium whitespace-nowrap shrink-0 transition-colors",
        colors.bg,
        colors.text,
        colors.dark,
        sizeClasses,
        onClick && "cursor-pointer hover:opacity-80",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <span className="opacity-60">#</span>
      {name}
      {removable && (
        <button
          type="button"
          className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        >
          <X className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
        </button>
      )}
    </span>
  );
}

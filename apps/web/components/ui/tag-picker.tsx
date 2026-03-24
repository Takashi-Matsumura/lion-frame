"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Hash, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { TagBadge } from "./tag-badge";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface SystemTag {
  id: string;
  name: string;
  nameJa: string | null;
  color: string;
  description?: string | null;
}

export interface TagPickerProps {
  entityType: string;
  entityId: string;
  currentSystemTags: SystemTag[];
  currentUserTags: string[];
  onTagsChange: (systemTags: SystemTag[], userTags: string[]) => void;
  compact?: boolean;
  language?: "en" | "ja";
}

export function TagPicker({
  entityType,
  entityId,
  currentSystemTags,
  currentUserTags,
  onTagsChange,
  compact = false,
  language = "ja",
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [allSystemTags, setAllSystemTags] = useState<SystemTag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTagInput, setUserTagInput] = useState("");
  const [selectedSystemTags, setSelectedSystemTags] = useState<SystemTag[]>(currentSystemTags);
  const [selectedUserTags, setSelectedUserTags] = useState<string[]>(currentUserTags);
  const userTagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedSystemTags(currentSystemTags);
    setSelectedUserTags(currentUserTags);
  }, [currentSystemTags, currentUserTags]);

  const fetchSystemTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) return;
      const data = await res.json();
      setAllSystemTags(data.tags ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSystemTags();
    }
  }, [open, fetchSystemTags]);

  const filteredSystemTags = allSystemTags.filter((tag) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return tag.name.toLowerCase().includes(q) || (tag.nameJa?.toLowerCase().includes(q) ?? false);
  });

  const toggleSystemTag = useCallback((tag: SystemTag) => {
    setSelectedSystemTags((prev) => {
      const exists = prev.some((t) => t.id === tag.id);
      return exists ? prev.filter((t) => t.id !== tag.id) : [...prev, tag];
    });
  }, []);

  const addUserTag = useCallback(() => {
    const trimmed = userTagInput.trim();
    if (!trimmed) return;
    if (selectedUserTags.includes(trimmed)) {
      setUserTagInput("");
      return;
    }
    setSelectedUserTags((prev) => [...prev, trimmed]);
    setUserTagInput("");
  }, [userTagInput, selectedUserTags]);

  const removeUserTag = useCallback((tag: string) => {
    setSelectedUserTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await fetch("/api/tags/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          systemTagIds: selectedSystemTags.map((t) => t.id),
          userTags: selectedUserTags,
        }),
      });
      onTagsChange(selectedSystemTags, selectedUserTags);
      setOpen(false);
    } catch { /* ignore */ }
  }, [entityType, entityId, selectedSystemTags, selectedUserTags, onTagsChange]);

  const t = {
    systemTags: language === "ja" ? "システムタグ" : "System Tags",
    userTags: language === "ja" ? "ユーザタグ" : "User Tags",
    search: language === "ja" ? "タグを検索..." : "Search tags...",
    addUserTag: language === "ja" ? "タグを入力してEnter..." : "Type and press Enter...",
    save: language === "ja" ? "保存" : "Save",
    cancel: language === "ja" ? "キャンセル" : "Cancel",
    noSystemTags: language === "ja" ? "システムタグがありません" : "No system tags",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(compact ? "h-7 w-7" : "h-8 w-8")}
          title={language === "ja" ? "タグ" : "Tags"}
        >
          <Hash className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 space-y-3">
          {/* システムタグセクション */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">{t.systemTags}</div>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-muted/50 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredSystemTags.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2 text-center">{t.noSystemTags}</div>
              ) : (
                filteredSystemTags.map((tag) => {
                  const isSelected = selectedSystemTags.some((t) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={cn(
                        "flex items-start gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted",
                      )}
                      onClick={() => toggleSystemTag(tag)}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border",
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <TagBadge name={language === "ja" && tag.nameJa ? tag.nameJa : tag.name} color={tag.color} />
                        {tag.description && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{tag.description}</div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 区切り線 */}
          <div className="border-t border-border" />

          {/* ユーザータグセクション */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">{t.userTags}</div>
            {selectedUserTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUserTags.map((tag) => (
                  <TagBadge
                    key={tag}
                    name={tag}
                    isUserTag
                    removable
                    onRemove={() => removeUserTag(tag)}
                  />
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <input
                ref={userTagInputRef}
                type="text"
                value={userTagInput}
                onChange={(e) => setUserTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addUserTag();
                  }
                }}
                placeholder={t.addUserTag}
                className="flex-1 px-2 py-1.5 text-sm bg-muted/50 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t.save}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

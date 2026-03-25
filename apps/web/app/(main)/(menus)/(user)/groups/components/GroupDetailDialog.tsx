"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  FiEdit2,
  FiTrash2,
  FiUserPlus,
  FiStar,
  FiX,
  FiArchive,
  FiCopy,
  FiCamera,
  FiPlus,
} from "react-icons/fi";
import { MemberPickerDialog } from "./MemberPickerDialog";

interface MemberData {
  id: string;
  role: "LEADER" | "MEMBER";
  title?: string | null;
  snapshotPosition?: string | null;
  snapshotDepartment?: string | null;
  snapshotSection?: string | null;
  employeeId: string;
  employee: {
    id: string;
    employeeId: string;
    name: string;
    nameKana: string | null;
    position: string;
    department: { name: string } | null;
    section: { name: string } | null;
    course: { name: string } | null;
  };
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  type: "OFFICIAL" | "PERSONAL";
  fiscalYear?: number | null;
  archivedAt?: string | null;
  createdBy: string;
  ownerName: string | null;
  memberCount: number;
  members: MemberData[];
}

type Role = "GUEST" | "USER" | "MANAGER" | "EXECUTIVE" | "ADMIN";

interface Props {
  group: GroupData;
  onClose: () => void;
  canEdit: boolean;
  userRole: Role;
  t: Record<string, string>;
}

export function GroupDetailDialog({ group, onClose, canEdit, userRole, t }: Props) {
  const isArchived = !!group.archivedAt;
  const isStanding = group.type === "OFFICIAL" && group.fiscalYear == null;
  const canModify = canEdit && !isArchived;
  const canCarryOver = canEdit && group.type === "OFFICIAL" && group.fiscalYear != null
    && (["MANAGER", "EXECUTIVE", "ADMIN"] as Role[]).includes(userRole);
  const canSnapshot = canEdit && isStanding && !isArchived;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [members, setMembers] = useState<MemberData[]>(group.members);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmCarryOver, setConfirmCarryOver] = useState(false);
  const [confirmSnapshot, setConfirmSnapshot] = useState(false);
  const [carryOverYear, setCarryOverYear] = useState(
    (group.fiscalYear ?? new Date().getFullYear()) + 1,
  );
  const [snapshotYear, setSnapshotYear] = useState(() => {
    const now = new Date();
    const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    return jst.getMonth() + 1 >= 4 ? jst.getFullYear() : jst.getFullYear() - 1;
  });

  const refreshGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${group.id}`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.group.members);
    }
  }, [group.id]);

  useEffect(() => {
    setName(group.name);
    setDescription(group.description || "");
    setMembers(group.members);
  }, [group]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
    onClose();
  };

  const handleArchive = async () => {
    const res = await fetch(`/api/groups/${group.id}/archive`, { method: "POST" });
    if (res.ok) {
      onClose();
    }
  };

  const handleUnarchive = async () => {
    const res = await fetch(`/api/groups/${group.id}/archive`, { method: "DELETE" });
    if (res.ok) {
      onClose();
    }
  };

  const handleCarryOver = async () => {
    const res = await fetch(`/api/groups/${group.id}/carryover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetFiscalYear: carryOverYear }),
    });
    if (res.ok) {
      setConfirmCarryOver(false);
      onClose();
    }
  };

  const handleSnapshot = async () => {
    const res = await fetch(`/api/groups/${group.id}/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiscalYear: snapshotYear }),
    });
    if (res.ok) {
      setConfirmSnapshot(false);
      onClose();
    }
  };

  const handleTitleUpdate = async (memberId: string, currentTitle: string | null | undefined, newTitle: string) => {
    const title = newTitle.trim() || null;
    if (title === (currentTitle || null)) return;
    const res = await fetch(`/api/groups/${group.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      // ローカルstateを直接更新（refreshGroupの代わりに即反映）
      setMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, title } : m),
      );
    }
  };

  const handleToggleLeader = async (member: MemberData) => {
    const newRole = member.role === "LEADER" ? "MEMBER" : "LEADER";
    await fetch(`/api/groups/${group.id}/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    await refreshGroup();
  };

  const handleRemoveMember = async (member: MemberData) => {
    await fetch(`/api/groups/${group.id}/members/${member.id}`, {
      method: "DELETE",
    });
    await refreshGroup();
  };

  const handleMembersAdded = async () => {
    setPickerOpen(false);
    await refreshGroup();
  };

  const memberInfo = (member: MemberData) => {
    // スナップショットデータがあればそちらを優先（アーカイブ時の状態）
    if (member.snapshotPosition || member.snapshotDepartment) {
      const position = member.snapshotPosition || "";
      const unit = [member.snapshotDepartment, member.snapshotSection].filter(Boolean).join(" > ");
      return unit ? `${position} | ${unit}` : position;
    }
    const position = member.employee.position;
    const parts = [member.employee.department?.name, member.employee.section?.name, member.employee.course?.name].filter(Boolean);
    const unit = parts.join(" > ");
    return unit ? `${position} | ${unit}` : position;
  };

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                />
              ) : (
                <span>{group.name}</span>
              )}
              {group.type === "OFFICIAL" && (
                <Badge variant="outline" className="shrink-0 text-xs px-1.5 py-0">
                  {group.fiscalYear != null ? `${group.fiscalYear}${t.fiscalYearSuffix}` : t.ongoing}
                </Badge>
              )}
              {isArchived && (
                <Badge variant="secondary" className="shrink-0 text-xs text-muted-foreground">
                  <FiArchive className="mr-0.5 h-3 w-3" />
                  {t.archived}
                </Badge>
              )}
              {canModify && !editing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(true)}
                >
                  <FiEdit2 className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {isArchived && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <FiArchive className="inline mr-1.5 h-3.5 w-3.5" />
              {isStanding ? t.disbandedBanner : t.archivedBanner}
            </div>
          )}

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t.description}</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.description}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!name.trim() || saving}
                  loading={saving}
                >
                  {t.save}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setName(group.name);
                    setDescription(group.description || "");
                  }}
                >
                  {t.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {group.description && (
                <p className="text-sm text-muted-foreground">
                  {group.description}
                </p>
              )}
              {group.type === "OFFICIAL" && group.ownerName && (
                <p className="text-xs text-muted-foreground">
                  {t.owner}: {group.ownerName}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {t.members} ({members.length})
              </h3>
              {canModify && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPickerOpen(true)}
                >
                  <FiUserPlus className="mr-1 h-4 w-4" />
                  {t.addMembers}
                </Button>
              )}
            </div>

            {members.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t.noMembers}
              </p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {member.employee.name}
                        </span>
                        {member.role === "LEADER" && (
                          <Badge
                            variant="default"
                            className="shrink-0 text-xs"
                          >
                            <FiStar className="mr-0.5 h-3 w-3" />
                            {t.leader}
                          </Badge>
                        )}
                        <MemberTitleBadge
                          memberId={member.id}
                          currentTitle={member.title}
                          canEdit={canModify}
                          placeholder={t.memberTitlePlaceholder}
                          onSave={handleTitleUpdate}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {memberInfo(member)}
                      </div>
                    </div>
                    {canModify && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={
                            member.role === "LEADER"
                              ? t.removeLeader
                              : t.setAsLeader
                          }
                          onClick={() => handleToggleLeader(member)}
                        >
                          <FiStar
                            className={`h-3.5 w-3.5 ${
                              member.role === "LEADER"
                                ? "fill-current text-yellow-500"
                                : ""
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          title={t.removeMember}
                          onClick={() => handleRemoveMember(member)}
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            {/* 確認モード: アーカイブ / 解散 */}
            {confirmArchive && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <span className="flex-1 text-sm">
                  {isArchived
                    ? t.unarchiveConfirmDesc
                    : isStanding
                      ? t.disbandConfirmDesc
                      : t.archiveConfirmDesc}
                </span>
                <Button
                  size="sm"
                  onClick={isArchived ? handleUnarchive : handleArchive}
                >
                  {isArchived
                    ? t.unarchive
                    : isStanding
                      ? t.disband
                      : t.archive}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmArchive(false)}
                >
                  {t.cancel}
                </Button>
              </div>
            )}

            {/* 確認モード: 引継ぎ */}
            {confirmCarryOver && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <span className="text-sm">{t.targetFiscalYear}:</span>
                <Input
                  type="number"
                  value={carryOverYear}
                  onChange={(e) => setCarryOverYear(parseInt(e.target.value, 10) || carryOverYear)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{t.fiscalYearSuffix}</span>
                <Button size="sm" onClick={handleCarryOver}>
                  {t.carryOver}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmCarryOver(false)}
                >
                  {t.cancel}
                </Button>
              </div>
            )}

            {/* 確認モード: スナップショット */}
            {confirmSnapshot && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <span className="flex-1 text-sm">{t.snapshotConfirmDesc}</span>
                <Input
                  type="number"
                  value={snapshotYear}
                  onChange={(e) => setSnapshotYear(parseInt(e.target.value, 10) || snapshotYear)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{t.fiscalYearSuffix}</span>
                <Button size="sm" onClick={handleSnapshot}>
                  {t.save}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmSnapshot(false)}
                >
                  {t.cancel}
                </Button>
              </div>
            )}

            {/* 確認モード: 削除（アーカイブ済みでは非表示） */}
            {confirmDelete && !isArchived && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
                <span className="flex-1 text-sm text-destructive">
                  {t.confirmDeleteDesc}
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  {t.delete}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                >
                  {t.cancel}
                </Button>
              </div>
            )}

            {/* 通常ボタン行 */}
            {!confirmArchive && !confirmCarryOver && !confirmDelete && !confirmSnapshot && (
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && group.type === "OFFICIAL" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmArchive(true)}
                  >
                    <FiArchive className="mr-1 h-3.5 w-3.5" />
                    {isArchived
                      ? t.unarchive
                      : isStanding
                        ? t.disband
                        : t.archive}
                  </Button>
                )}
                {canCarryOver && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmCarryOver(true)}
                  >
                    <FiCopy className="mr-1 h-3.5 w-3.5" />
                    {t.carryOver}
                  </Button>
                )}
                {canSnapshot && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmSnapshot(true)}
                  >
                    <FiCamera className="mr-1 h-3.5 w-3.5" />
                    {t.snapshot}
                  </Button>
                )}
                <div className="flex-1" />
                {canEdit && !isArchived && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <FiTrash2 className="mr-1 h-3.5 w-3.5" />
                    {t.deleteGroup}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose}>
                  {t.close}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MemberPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        groupId={group.id}
        existingMemberIds={members.map((m) => m.employee.id)}
        onAdded={handleMembersAdded}
        t={t}
      />
    </>
  );
}

function MemberTitleBadge({
  memberId,
  currentTitle,
  canEdit,
  placeholder,
  onSave,
}: {
  memberId: string;
  currentTitle: string | null | undefined;
  canEdit: boolean;
  placeholder: string;
  onSave: (memberId: string, currentTitle: string | null | undefined, newTitle: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentTitle || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const trimmed = value.trim();
    if (trimmed === (currentTitle || "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(memberId, currentTitle, trimmed);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="shrink-0 rounded border border-primary bg-transparent px-1.5 py-0 text-xs outline-none w-28"
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            setValue(currentTitle || "");
            setEditing(false);
          }
        }}
      />
    );
  }

  if (currentTitle) {
    return (
      <Badge
        variant="outline"
        className={`shrink-0 text-xs ${canEdit ? "cursor-pointer hover:bg-accent" : ""}`}
        onClick={canEdit ? (e) => { e.stopPropagation(); setEditing(true); } : undefined}
      >
        {currentTitle}
      </Badge>
    );
  }

  if (canEdit) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/40 hover:border-primary hover:text-primary transition-colors"
        title={placeholder}
      >
        <FiPlus className="h-3 w-3" />
      </button>
    );
  }

  return null;
}

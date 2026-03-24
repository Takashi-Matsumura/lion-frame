import { prisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";
import type { Tag, TagAssignment } from "@prisma/client";

// タグカラーパレット
export const TAG_COLORS = [
  { name: "blue", labelJa: "青" },
  { name: "green", labelJa: "緑" },
  { name: "red", labelJa: "赤" },
  { name: "purple", labelJa: "紫" },
  { name: "orange", labelJa: "橙" },
  { name: "yellow", labelJa: "黄" },
  { name: "pink", labelJa: "桃" },
  { name: "cyan", labelJa: "水" },
  { name: "gray", labelJa: "灰" },
] as const;

export type TagColor = (typeof TAG_COLORS)[number]["name"];

export interface EntityTags {
  systemTags: Array<{ id: string; name: string; nameJa: string | null; color: string }>;
  userTags: string[];
}

export interface TagWithCount extends Tag {
  _count: { assignments: number };
}

export class TagService {
  // ========================================
  // システムタグ CRUD（ADMIN用）
  // ========================================

  static async createTag(data: {
    name: string;
    nameJa?: string;
    color?: string;
    description?: string;
    createdBy: string;
  }): Promise<Tag> {
    const tag = await prisma.tag.create({
      data: {
        name: data.name.trim(),
        nameJa: data.nameJa?.trim() || null,
        color: data.color || "blue",
        description: data.description?.trim() || null,
        createdBy: data.createdBy,
      },
    });

    await AuditService.log({
      action: "TAG_CREATE",
      category: "TAG",
      userId: data.createdBy,
      targetId: tag.id,
      targetType: "Tag",
      details: { name: tag.name, color: tag.color },
    });

    return tag;
  }

  static async updateTag(
    id: string,
    data: { name?: string; nameJa?: string; color?: string; description?: string },
    userId: string,
  ): Promise<Tag> {
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.nameJa !== undefined && { nameJa: data.nameJa.trim() || null }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.description !== undefined && { description: data.description.trim() || null }),
      },
    });

    await AuditService.log({
      action: "TAG_UPDATE",
      category: "TAG",
      userId,
      targetId: tag.id,
      targetType: "Tag",
      details: { name: tag.name, updated: data },
    });

    return tag;
  }

  static async deleteTag(id: string, userId: string): Promise<void> {
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) return;

    await prisma.tag.delete({ where: { id } });

    await AuditService.log({
      action: "TAG_DELETE",
      category: "TAG",
      userId,
      targetId: id,
      targetType: "Tag",
      details: { name: tag.name },
    });
  }

  static async getTag(id: string): Promise<Tag | null> {
    return prisma.tag.findUnique({ where: { id } });
  }

  static async listTags(): Promise<Tag[]> {
    return prisma.tag.findMany({ orderBy: { name: "asc" } });
  }

  static async listTagsWithCount(): Promise<TagWithCount[]> {
    return prisma.tag.findMany({
      include: { _count: { select: { assignments: true } } },
      orderBy: { name: "asc" },
    });
  }

  // ========================================
  // タグ割り当て
  // ========================================

  static async assignSystemTag(
    tagId: string,
    entityType: string,
    entityId: string,
    assignedBy: string,
  ): Promise<TagAssignment> {
    const assignment = await prisma.tagAssignment.upsert({
      where: {
        tagId_entityType_entityId: { tagId, entityType, entityId },
      },
      create: { tagId, entityType, entityId, assignedBy },
      update: {},
    });

    await AuditService.log({
      action: "TAG_ASSIGN",
      category: "TAG",
      userId: assignedBy,
      targetId: entityId,
      targetType: entityType,
      details: { tagId, type: "system" },
    });

    return assignment;
  }

  static async assignUserTag(
    userTag: string,
    entityType: string,
    entityId: string,
    assignedBy: string,
  ): Promise<TagAssignment> {
    const trimmed = userTag.trim();
    if (!trimmed) throw new Error("User tag cannot be empty");

    const assignment = await prisma.tagAssignment.upsert({
      where: {
        userTag_entityType_entityId_assignedBy: {
          userTag: trimmed,
          entityType,
          entityId,
          assignedBy,
        },
      },
      create: { userTag: trimmed, entityType, entityId, assignedBy },
      update: {},
    });

    await AuditService.log({
      action: "TAG_ASSIGN",
      category: "TAG",
      userId: assignedBy,
      targetId: entityId,
      targetType: entityType,
      details: { userTag: trimmed, type: "user" },
    });

    return assignment;
  }

  static async unassignTag(assignmentId: string, userId: string): Promise<void> {
    const assignment = await prisma.tagAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) return;

    await prisma.tagAssignment.delete({ where: { id: assignmentId } });

    await AuditService.log({
      action: "TAG_UNASSIGN",
      category: "TAG",
      userId,
      targetId: assignment.entityId,
      targetType: assignment.entityType,
      details: {
        tagId: assignment.tagId,
        userTag: assignment.userTag,
      },
    });
  }

  static async getTagsForEntity(entityType: string, entityId: string): Promise<EntityTags> {
    const assignments = await prisma.tagAssignment.findMany({
      where: { entityType, entityId },
      include: { tag: true },
    });

    const systemTags = assignments
      .filter((a) => a.tag !== null)
      .map((a) => ({
        id: a.tag!.id,
        name: a.tag!.name,
        nameJa: a.tag!.nameJa,
        color: a.tag!.color,
      }));

    const userTags = assignments
      .filter((a) => a.userTag !== null)
      .map((a) => a.userTag!);

    return { systemTags, userTags };
  }

  static async setTagsForEntity(
    systemTagIds: string[],
    userTags: string[],
    entityType: string,
    entityId: string,
    assignedBy: string,
  ): Promise<EntityTags> {
    // 既存の割り当てを全削除して再作成
    await prisma.tagAssignment.deleteMany({
      where: { entityType, entityId },
    });

    const assignments: Array<{
      tagId?: string;
      userTag?: string;
      entityType: string;
      entityId: string;
      assignedBy: string;
    }> = [];

    for (const tagId of systemTagIds) {
      assignments.push({ tagId, entityType, entityId, assignedBy });
    }
    for (const ut of userTags) {
      const trimmed = ut.trim();
      if (trimmed) {
        assignments.push({ userTag: trimmed, entityType, entityId, assignedBy });
      }
    }

    if (assignments.length > 0) {
      await prisma.tagAssignment.createMany({ data: assignments });
    }

    await AuditService.log({
      action: "TAG_ASSIGN",
      category: "TAG",
      userId: assignedBy,
      targetId: entityId,
      targetType: entityType,
      details: {
        systemTagIds,
        userTags,
        type: "bulk_set",
      },
    });

    return this.getTagsForEntity(entityType, entityId);
  }

  // ========================================
  // 検索・統計
  // ========================================

  static async getTagUsageStats(): Promise<TagWithCount[]> {
    return prisma.tag.findMany({
      include: { _count: { select: { assignments: true } } },
      orderBy: { name: "asc" },
    });
  }

  static async searchEntitiesByTag(
    options: {
      tagId?: string;
      userTag?: string;
      entityType?: string;
    } = {},
  ): Promise<TagAssignment[]> {
    return prisma.tagAssignment.findMany({
      where: {
        ...(options.tagId && { tagId: options.tagId }),
        ...(options.userTag && { userTag: options.userTag }),
        ...(options.entityType && { entityType: options.entityType }),
      },
      include: { tag: true },
      orderBy: { assignedAt: "desc" },
    });
  }

  static async getEntitiesByTagIds(
    tagIds: string[],
    entityType: string,
  ): Promise<string[]> {
    if (tagIds.length === 0) return [];

    const assignments = await prisma.tagAssignment.findMany({
      where: {
        tagId: { in: tagIds },
        entityType,
      },
      select: { entityId: true },
      distinct: ["entityId"],
    });

    return assignments.map((a) => a.entityId);
  }
}

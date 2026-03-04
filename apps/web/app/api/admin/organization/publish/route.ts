import { apiHandler, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/**
 * GET /api/admin/organization/publish
 *
 * 組織の公開設定を取得
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    throw ApiError.badRequest("Organization ID is required");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      status: true,
      publishAt: true,
      publishedAt: true,
    },
  });

  if (!organization) {
    throw ApiError.notFound("Organization not found");
  }

  return organization;
}, { admin: true });

/**
 * PATCH /api/admin/organization/publish
 *
 * 組織の公開設定を更新
 *
 * Body:
 * - organizationId: string (required)
 * - action: "publish" | "schedule" | "cancel" | "archive" (required)
 * - publishAt?: string (ISO date, required for "schedule")
 */
export const PATCH = apiHandler(async (request, session) => {
  const body = await request.json();
  const { organizationId, action, publishAt } = body;

  if (!organizationId || !action) {
    throw ApiError.badRequest("Organization ID and action are required");
  }

  if (!["publish", "schedule", "cancel", "archive"].includes(action)) {
    throw ApiError.badRequest(
      "Invalid action. Must be publish, schedule, cancel, or archive",
    );
  }

  // Get current organization
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw ApiError.notFound("Organization not found");
  }

  let updateData: {
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
    publishAt?: Date | null;
    publishedAt?: Date | null;
  };

  switch (action) {
    case "publish":
      // Immediately publish the organization
      // Multiple organizations can be PUBLISHED simultaneously
      updateData = {
        status: "PUBLISHED",
        publishAt: null,
        publishedAt: new Date(),
      };
      break;

    case "schedule": {
      if (!publishAt) {
        throw ApiError.badRequest("Publish date is required for scheduling");
      }

      const scheduledDate = new Date(publishAt);
      if (scheduledDate <= new Date()) {
        throw ApiError.badRequest("Publish date must be in the future");
      }

      updateData = {
        status: "SCHEDULED",
        publishAt: scheduledDate,
        publishedAt: null,
      };
      break;
    }

    case "cancel":
      // Cancel scheduled publish, revert to draft
      updateData = {
        status: "DRAFT",
        publishAt: null,
        publishedAt: null,
      };
      break;

    case "archive":
      updateData = {
        status: "ARCHIVED",
        publishAt: null,
      };
      break;

    default:
      throw ApiError.badRequest("Invalid action");
  }

  const updatedOrganization = await prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
    select: {
      id: true,
      name: true,
      status: true,
      publishAt: true,
      publishedAt: true,
    },
  });

  await AuditService.log({
    action: "ORGANIZATION_PUBLISH",
    category: "SYSTEM_SETTING",
    userId: session.user?.id,
    targetId: organizationId,
    targetType: "Organization",
    details: {
      action,
      previousStatus: organization.status,
      newStatus: updatedOrganization.status,
    },
  });

  return {
    success: true,
    organization: updatedOrganization,
  };
}, { admin: true });

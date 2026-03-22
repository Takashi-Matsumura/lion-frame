import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { HealthCheckupService } from "@/lib/addon-modules/health-checkup/health-checkup-service";
import type { Role } from "@prisma/client";

const requiredRoles = ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[];

function extractId(request: Request): string {
  const url = new URL(request.url);
  const id = url.pathname.split("/api/health-checkup/")[1]?.split("/")[0];
  if (!id) throw ApiError.badRequest("Campaign ID is required");
  return id;
}

export const GET = apiHandler(async (request) => {
  const id = extractId(request);
  const campaign = await HealthCheckupService.getCampaignById(id);
  if (!campaign) throw ApiError.notFound("Campaign not found", "キャンペーンが見つかりません");

  const stats = await HealthCheckupService.getCampaignStats(id);
  const departments = await HealthCheckupService.getDepartmentStats(id);

  return { campaign, stats, departments };
}, { requiredRoles });

export const PUT = apiHandler(async (request) => {
  const id = extractId(request);
  const body = await request.json();
  const campaign = await HealthCheckupService.updateCampaign(id, body);
  return { campaign };
}, { requiredRoles });

export const DELETE = apiHandler(async (request) => {
  const id = extractId(request);
  await HealthCheckupService.deleteCampaign(id);
  return { success: true };
}, { requiredRoles });

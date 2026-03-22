import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { HealthCheckupService } from "@/lib/addon-modules/health-checkup/health-checkup-service";
import type { Role } from "@prisma/client";

const requiredRoles = ["MANAGER", "EXECUTIVE", "ADMIN"] as Role[];

export const GET = apiHandler(async () => {
  const campaigns = await HealthCheckupService.getCampaigns();
  return { campaigns };
}, { requiredRoles });

export const POST = apiHandler(async (request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const body = await request.json();
  if (!body.title || !body.fiscalYear) {
    throw ApiError.badRequest(
      "Title and fiscal year are required",
      "タイトルと年度は必須です",
    );
  }

  const campaign = await HealthCheckupService.createCampaign(body, userId);
  return { campaign };
}, { requiredRoles, successStatus: 201 });

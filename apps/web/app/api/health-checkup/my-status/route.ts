import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health-checkup/my-status
 * ログインユーザの健康診断ステータスを返す
 */
export const GET = apiHandler(async (_request, session) => {
  const userId = session.user?.id;
  if (!userId) throw ApiError.unauthorized();

  // User → Employee（email一致）
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return { records: [] };

  const employee = await prisma.employee.findFirst({
    where: { email: user.email, isActive: true },
    select: { id: true },
  });
  if (!employee) return { records: [] };

  // 自分のHealthCheckupRecordをキャンペーン情報付きで取得
  const records = await prisma.healthCheckupRecord.findMany({
    where: { employeeId: employee.id },
    include: {
      campaign: {
        select: { id: true, title: true, fiscalYear: true, deadline: true },
      },
    },
    orderBy: { campaign: { createdAt: "desc" } },
  });

  return {
    records: records.map((r) => ({
      campaignTitle: r.campaign.title,
      fiscalYear: r.campaign.fiscalYear,
      deadline: r.campaign.deadline,
      status: r.status,
      bookingMethod: r.bookingMethod,
      facility: r.facility,
      confirmedDate: r.confirmedDate,
    })),
  };
}, {});

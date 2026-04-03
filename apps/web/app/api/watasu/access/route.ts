import { auth } from "@/auth";
import { WatasuAccessService } from "@/lib/addon-modules/watasu/access-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (!["MANAGER", "EXECUTIVE", "ADMIN"].includes(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const employees = await WatasuAccessService.getEmployeesWithAccessStatus(
    session.user.id,
    role,
  );

  return Response.json({ employees });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (!["MANAGER", "EXECUTIVE", "ADMIN"].includes(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, employeeId, enabled } = body;

  if (!userId || typeof enabled !== "boolean") {
    return Response.json(
      { error: "userId and enabled are required" },
      { status: 400 },
    );
  }

  // MANAGER は自部門メンバーのみ管理可能
  if (role === "MANAGER" && employeeId) {
    const canManage = await WatasuAccessService.canManageEmployee(
      session.user.id,
      employeeId,
    );
    if (!canManage) {
      return Response.json(
        { error: "Cannot manage this employee" },
        { status: 403 },
      );
    }
  }

  await WatasuAccessService.toggleAccess(userId, enabled, session.user.id);

  return Response.json({ success: true });
}

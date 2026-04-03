import {
  getSandbox,
  addJoinerToken,
} from "@/lib/addon-modules/watasu/sandbox-store";
import { AuditService } from "@/lib/services/audit-service";

export async function POST(request: Request) {
  const body = await request.json();
  const { sandboxId } = body;

  if (!sandboxId) {
    return Response.json({ error: "sandboxId required" }, { status: 400 });
  }

  const sandbox = getSandbox(sandboxId);
  if (!sandbox) {
    return Response.json({ error: "Sandbox not found" }, { status: 404 });
  }

  const joinerToken = addJoinerToken(sandboxId);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  await AuditService.log({
    action: "WATASU_SANDBOX_JOIN",
    category: "MODULE",
    userId: sandbox.createdBy,
    targetId: sandboxId,
    targetType: "Sandbox",
    details: { pin: sandboxId, senderIp: ip },
    ipAddress: ip,
  });

  return Response.json({ sandboxId, joinerToken, role: "sender" });
}

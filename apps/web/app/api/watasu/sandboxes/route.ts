import { auth } from "@/auth";
import {
  createSandbox,
  getSandboxesByUser,
} from "@/lib/addon-modules/watasu/sandbox-store";
import { AuditService } from "@/lib/services/audit-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sandboxes = getSandboxesByUser(session.user.id);
  return Response.json({ sandboxes });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sandbox, creatorToken } = await createSandbox(session.user.id);

  await AuditService.log({
    action: "WATASU_SANDBOX_CREATE",
    category: "MODULE",
    userId: session.user.id,
    targetId: sandbox.id,
    targetType: "Sandbox",
    details: { pin: sandbox.id },
  });

  return Response.json({ sandboxId: sandbox.id, creatorToken });
}

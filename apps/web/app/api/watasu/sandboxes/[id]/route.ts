import { auth } from "@/auth";
import {
  getSandbox,
  getRole,
  getSandboxInfo,
  deleteSandboxById,
} from "@/lib/addon-modules/watasu/sandbox-store";
import { AuditService } from "@/lib/services/audit-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sandbox = getSandbox(id, false);
  if (!sandbox) {
    return Response.json({ error: "Sandbox not found" }, { status: 404 });
  }

  // セッション認証（受信者）またはトークン認証（送信者）
  const session = await auth();
  if (session?.user?.id === sandbox.createdBy) {
    return Response.json(getSandboxInfo(sandbox, "receiver"));
  }

  const token = request.headers.get("x-sandbox-token");
  if (!token) {
    return Response.json({ error: "Token required" }, { status: 401 });
  }

  const role = getRole(sandbox, token);
  if (!role) {
    return Response.json({ error: "Invalid token" }, { status: 403 });
  }

  return Response.json(getSandboxInfo(sandbox, role));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sandbox = getSandbox(id, false);
  if (!sandbox) {
    return Response.json({ error: "Sandbox not found" }, { status: 404 });
  }

  if (sandbox.createdBy !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const fileCount = sandbox.files.length;
  deleteSandboxById(id);

  await AuditService.log({
    action: "WATASU_SANDBOX_CLOSE",
    category: "MODULE",
    userId: session.user.id,
    targetId: id,
    targetType: "Sandbox",
    details: { pin: id, fileCount },
  });

  return Response.json({ success: true });
}

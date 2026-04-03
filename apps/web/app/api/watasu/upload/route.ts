import {
  getSandbox,
  getRole,
  addFile,
  updateFileStatus,
  getSandboxInfo,
} from "@/lib/addon-modules/watasu/sandbox-store";
import { checkFile } from "@/lib/addon-modules/watasu/security";
import { AuditService } from "@/lib/services/audit-service";

export async function POST(request: Request) {
  const token = request.headers.get("x-sandbox-token");
  const sandboxId = request.headers.get("x-sandbox-id");

  if (!token || !sandboxId) {
    return Response.json(
      { error: "Token and sandboxId required" },
      { status: 401 },
    );
  }

  const sandbox = getSandbox(sandboxId);
  if (!sandbox) {
    return Response.json({ error: "Sandbox not found" }, { status: 404 });
  }

  const role = getRole(sandbox, token);
  if (role !== "sender") {
    return Response.json(
      { error: "Only senders can upload" },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }

  for (const file of files) {
    const fileInfo = await addFile(sandboxId, file);
    if (!fileInfo) continue;

    const result = await checkFile(
      fileInfo.path,
      fileInfo.name,
      fileInfo.mimeType,
    );

    if (result.approved) {
      updateFileStatus(
        sandboxId,
        fileInfo.id,
        "approved",
        undefined,
        result.checks,
      );
    } else {
      updateFileStatus(
        sandboxId,
        fileInfo.id,
        "rejected",
        result.reason,
        result.checks,
      );
    }

    await AuditService.log({
      action: "WATASU_FILE_UPLOAD",
      category: "MODULE",
      userId: sandbox.createdBy,
      targetId: fileInfo.id,
      targetType: "File",
      details: {
        pin: sandboxId,
        fileName: fileInfo.name,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        approved: result.approved,
        reason: result.reason,
      },
    });
  }

  return Response.json(getSandboxInfo(sandbox, "sender"));
}

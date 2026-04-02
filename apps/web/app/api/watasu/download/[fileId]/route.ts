import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { auth } from "@/auth";
import { getSandbox, getFilePath } from "@/lib/addon-modules/watasu/sandbox-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const sandboxId = new URL(request.url).searchParams.get("sandboxId");
  if (!sandboxId) {
    return Response.json({ error: "sandboxId required" }, { status: 400 });
  }

  const sandbox = getSandbox(sandboxId);
  if (!sandbox) {
    return Response.json({ error: "Sandbox not found" }, { status: 404 });
  }

  if (sandbox.createdBy !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const fileInfo = getFilePath(sandboxId, fileId);
  if (!fileInfo) {
    return Response.json(
      { error: "File not found or not approved" },
      { status: 404 },
    );
  }

  const fileStat = await stat(fileInfo.path).catch(() => null);
  if (!fileStat) {
    return Response.json({ error: "File not found on disk" }, { status: 404 });
  }

  const nodeStream = createReadStream(fileInfo.path);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": fileInfo.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileInfo.name)}"`,
      "Content-Length": String(fileStat.size),
    },
  });
}

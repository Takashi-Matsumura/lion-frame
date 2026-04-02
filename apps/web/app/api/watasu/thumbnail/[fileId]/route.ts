import sharp from "sharp";
import { getSandbox, getRole, getFilePath } from "@/lib/addon-modules/watasu/sandbox-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  const sandboxId = new URL(request.url).searchParams.get("sandboxId");
  if (!sandboxId) {
    return Response.json({ error: "sandboxId required" }, { status: 400 });
  }

  const sandbox = getSandbox(sandboxId, false);
  if (!sandbox) {
    return Response.json({ error: "Sandbox not found" }, { status: 404 });
  }

  // 受信者（セッション）または送信者（トークン）どちらもサムネイル閲覧可
  const token = request.headers.get("x-sandbox-token");
  if (token) {
    const role = getRole(sandbox, token);
    if (!role) {
      return Response.json({ error: "Invalid token" }, { status: 403 });
    }
  }

  const fileInfo = getFilePath(sandboxId, fileId);
  if (!fileInfo) {
    return Response.json(
      { error: "File not found or not approved" },
      { status: 404 },
    );
  }

  try {
    const thumbnail = await sharp(fileInfo.path)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 70 })
      .toBuffer();

    return new Response(thumbnail.buffer.slice(thumbnail.byteOffset, thumbnail.byteOffset + thumbnail.byteLength) as ArrayBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to generate thumbnail" },
      { status: 500 },
    );
  }
}

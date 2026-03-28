import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { apiHandler } from "@/lib/api/api-handler";
import { ApiError } from "@/lib/api/api-error";

const MIME_TO_EXT: Record<string, string> = {
  // 画像
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  // 動画
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const ALLOWED_TYPES = Object.keys(MIME_TO_EXT);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

// POST /api/editor/media — メディアファイルアップロード
export const POST = apiHandler(async (request, session) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    throw ApiError.badRequest("No file uploaded");
  }

  // MIMEタイプ検証
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw ApiError.badRequest(
      "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV, WebM",
    );
  }

  // ファイルサイズ検証
  const maxSize = isVideo(file.type) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const limitMB = maxSize / (1024 * 1024);
    throw ApiError.badRequest(`File too large. Maximum size is ${limitMB}MB`);
  }

  // ユニークファイル名生成（MIMEタイプから拡張子を導出）
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = MIME_TO_EXT[file.type] || "bin";
  const filename = `${timestamp}-${random}.${extension}`;

  // 保存先ディレクトリ
  const baseDir = resolve(process.cwd(), "public", "uploads", "editor-media");
  const filepath = resolve(baseDir, filename);

  // パストラバーサル防止
  if (!filepath.startsWith(baseDir)) {
    throw ApiError.badRequest("Invalid filename");
  }

  // ディレクトリ作成（初回のみ）
  await mkdir(baseDir, { recursive: true });

  // ファイル保存
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);

  const url = `/uploads/editor-media/${filename}`;
  const mediaType = isVideo(file.type) ? "video" : "image";

  return { url, mediaType, filename, size: file.size };
});

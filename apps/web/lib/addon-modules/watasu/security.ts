import { open } from "node:fs/promises";
import sharp from "sharp";

type ImageType = "jpeg" | "png" | "gif" | "heic";

export interface CheckResult {
  approved: boolean;
  reason?: string;
  checks: { name: string; passed: boolean; description: string }[];
}

const MAGIC_BYTES: { type: ImageType; offset: number; bytes: number[] }[] = [
  { type: "jpeg", offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { type: "png", offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "gif", offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
];

const HEIC_FTYP_BRANDS = ["heic", "heis", "mif1", "msf1", "heif"];

const EXT_MAP: Record<string, ImageType> = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".gif": "gif",
  ".heic": "heic",
  ".heif": "heic",
};

const MIME_MAP: Record<string, ImageType> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heic",
};

async function detectType(filePath: string): Promise<ImageType | null> {
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(12);
    await fh.read(buf, 0, 12, 0);

    for (const { type, offset, bytes } of MAGIC_BYTES) {
      if (bytes.every((b, i) => buf[offset + i] === b)) {
        return type;
      }
    }

    const ftyp = buf.subarray(4, 8).toString("ascii");
    if (ftyp === "ftyp") {
      const brand = buf.subarray(8, 12).toString("ascii");
      if (HEIC_FTYP_BRANDS.some((b) => brand.startsWith(b))) {
        return "heic";
      }
    }

    return null;
  } finally {
    await fh.close();
  }
}

export async function checkFile(
  filePath: string,
  originalName: string,
  claimedMimeType: string,
): Promise<CheckResult> {
  const checks: CheckResult["checks"] = [];

  const detectedType = await detectType(filePath);
  if (!detectedType) {
    checks.push({ name: "magic_bytes", passed: false, description: "ファイル形式を特定できません" });
    return { approved: false, reason: "unknown_file_type", checks };
  }
  checks.push({ name: "magic_bytes", passed: true, description: `形式: ${detectedType.toUpperCase()}` });

  const ext = originalName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const expectedTypeFromExt = EXT_MAP[ext];
  if (!expectedTypeFromExt) {
    checks.push({ name: "extension", passed: false, description: `非対応の拡張子: ${ext || "(なし)"}` });
    return { approved: false, reason: "unsupported_extension", checks };
  }
  if (expectedTypeFromExt !== detectedType) {
    checks.push({ name: "extension", passed: false, description: `拡張子 ${ext} と実際の形式 ${detectedType.toUpperCase()} が不一致` });
    return { approved: false, reason: "extension_mismatch", checks };
  }
  checks.push({ name: "extension", passed: true, description: `拡張子 ${ext} が形式と一致` });

  const expectedTypeFromMime = MIME_MAP[claimedMimeType];
  if (expectedTypeFromMime && expectedTypeFromMime !== detectedType) {
    checks.push({ name: "mime_type", passed: false, description: `MIME ${claimedMimeType} と実際の形式 ${detectedType.toUpperCase()} が不一致` });
    return { approved: false, reason: "mime_mismatch", checks };
  }
  checks.push({ name: "mime_type", passed: true, description: `MIME ${claimedMimeType} が形式と一致` });

  try {
    await sharp(filePath).metadata();
    checks.push({ name: "decode", passed: true, description: "画像デコード成功" });
  } catch {
    if (detectedType === "heic") {
      checks.push({ name: "decode", passed: true, description: "HEICファイル（マジックバイト検証済み）" });
      return { approved: true, checks };
    }
    checks.push({ name: "decode", passed: false, description: "画像としてデコードできません" });
    return { approved: false, reason: "decode_failed", checks };
  }

  return { approved: true, checks };
}

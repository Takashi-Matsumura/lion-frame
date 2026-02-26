import { unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

/** Derive file extension from MIME type (security: never trust file.name) */
function extensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return map[mimeType] || "bin";
}

// Upload profile image
export const POST = apiHandler(async (request, session) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    throw ApiError.badRequest("No file uploaded");
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw ApiError.badRequest(
      "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed",
    );
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw ApiError.badRequest("File too large. Maximum size is 5MB");
  }

  // Generate unique filename using MIME-derived extension (not user-supplied name)
  const timestamp = Date.now();
  const extension = extensionFromMime(file.type);
  const filename = `${session.user.id}-${timestamp}.${extension}`;
  const baseDir = resolve(process.cwd(), "public", "uploads", "profile-images");
  const filepath = resolve(baseDir, filename);

  // Path traversal prevention
  if (!filepath.startsWith(baseDir)) {
    throw ApiError.badRequest("Invalid filename");
  }

  // Convert file to buffer and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);

  // Get current user to delete old image if exists
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  // Delete old image file if it exists and is a local file
  if (currentUser?.image?.startsWith("/uploads/profile-images/")) {
    try {
      const oldFilepath = join(process.cwd(), "public", currentUser.image);
      await unlink(oldFilepath);
    } catch (error) {
      console.error("Failed to delete old image:", error);
      // Continue even if deletion fails
    }
  }

  // Update user image path in database
  const imageUrl = `/uploads/profile-images/${filename}`;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
  });

  await AuditService.log({
    action: "PROFILE_IMAGE_UPDATE",
    category: "USER_MANAGEMENT",
    userId: session.user.id,
    targetId: session.user.id,
    targetType: "User",
  });

  return {
    success: true,
    imageUrl,
  };
});

// Delete profile image
export const DELETE = apiHandler(async (_request, session) => {
  // Get current user
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  // Delete image file if it exists and is a local file
  if (currentUser?.image?.startsWith("/uploads/profile-images/")) {
    try {
      const filepath = join(process.cwd(), "public", currentUser.image);
      await unlink(filepath);
    } catch (error) {
      console.error("Failed to delete image file:", error);
      // Continue even if deletion fails
    }
  }

  // Remove image path from database
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null },
  });

  await AuditService.log({
    action: "PROFILE_IMAGE_DELETE",
    category: "USER_MANAGEMENT",
    userId: session.user.id,
    targetId: session.user.id,
    targetType: "User",
  });

  return { success: true };
});

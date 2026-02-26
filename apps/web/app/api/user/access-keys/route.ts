import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Get user's registered Access keys
export const GET = apiHandler(async (_request, session) => {
  const userAccessKeys = await prisma.userAccessKey.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      accessKey: true,
    },
    orderBy: {
      activatedAt: "desc",
    },
  });

  return { userAccessKeys };
});

// Register Access key for user
export const POST = apiHandler(async (request, session) => {
  const body = await request.json();
  const { accessKey } = body;

  if (!accessKey) {
    throw ApiError.badRequest("Access key is required");
  }

  // Find the Access key
  const foundAccessKey = await prisma.accessKey.findUnique({
    where: { key: accessKey },
    include: {
      targetUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!foundAccessKey) {
    throw ApiError.notFound("Invalid Access key");
  }

  // IMPORTANT: Check if this Access key is for the current user
  if (
    foundAccessKey.targetUserId &&
    foundAccessKey.targetUserId !== session.user.id
  ) {
    throw ApiError.forbidden("This Access key is not issued for you");
  }

  // Check if Access key is active
  if (!foundAccessKey.isActive) {
    throw ApiError.forbidden("This Access key has been deactivated");
  }

  // Check if Access key has expired
  if (new Date(foundAccessKey.expiresAt) < new Date()) {
    throw ApiError.forbidden("This Access key has expired");
  }

  // Check if user already registered this Access key
  const existing = await prisma.userAccessKey.findUnique({
    where: {
      userId_accessKeyId: {
        userId: session.user.id,
        accessKeyId: foundAccessKey.id,
      },
    },
  });

  if (existing) {
    throw ApiError.badRequest("You have already registered this Access key");
  }

  // Register the Access key for the user
  const userAccessKey = await prisma.userAccessKey.create({
    data: {
      userId: session.user.id,
      accessKeyId: foundAccessKey.id,
    },
    include: {
      accessKey: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return { userAccessKey };
});

// Remove user's registered Access key
export const DELETE = apiHandler(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    throw ApiError.badRequest("Missing user Access key ID");
  }

  // Ensure the user owns this Access key registration
  const userAccessKey = await prisma.userAccessKey.findUnique({
    where: { id },
  });

  if (!userAccessKey || userAccessKey.userId !== session.user.id) {
    throw ApiError.notFound("Not found or unauthorized");
  }

  await prisma.userAccessKey.delete({
    where: { id },
  });

  return { success: true };
});

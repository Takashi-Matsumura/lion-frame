import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * 予約承認/却下
 * POST /api/general-affairs/reservations/[id]/approve
 * body: { action: "approve" | "reject", reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 },
      );
    }

    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { resource: { include: { category: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING reservations can be approved/rejected" },
        { status: 400 },
      );
    }

    if (action === "approve") {
      const reservation = await prisma.reservation.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
        include: {
          resource: { include: { category: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Notify the applicant
      await NotificationService.create({
        userId: existing.userId,
        type: "ACTION",
        title: `Reservation Approved: ${existing.resource.name}`,
        titleJa: `予約が承認されました: ${existing.resource.name}`,
        message: `Your reservation "${existing.title}" has been approved.`,
        messageJa: `予約「${existing.title}」が承認されました。`,
        actionUrl: "/reservations",
        source: "general-affairs",
        sourceId: id,
      }).catch(console.error);

      return NextResponse.json(reservation);
    }

    // reject
    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason?.trim() || "Rejected by administrator",
      },
      include: {
        resource: { include: { category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify the applicant
    await NotificationService.create({
      userId: existing.userId,
      type: "ACTION",
      title: `Reservation Rejected: ${existing.resource.name}`,
      titleJa: `予約が却下されました: ${existing.resource.name}`,
      message: `Your reservation "${existing.title}" was rejected. Reason: ${reason || "N/A"}`,
      messageJa: `予約「${existing.title}」が却下されました。理由: ${reason || "なし"}`,
      actionUrl: "/reservations",
      source: "general-affairs",
      sourceId: id,
    }).catch(console.error);

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Failed to approve/reject reservation:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 },
    );
  }
}

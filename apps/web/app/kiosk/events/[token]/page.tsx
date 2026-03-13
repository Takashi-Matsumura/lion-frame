import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyKioskSession } from "@/lib/kiosk/verify-session";
import { KioskCheckInClient } from "./KioskCheckInClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const session = await verifyKioskSession();
  const eventName = session?.kioskEvent?.name;
  return {
    title: eventName || `Kiosk - ${token.slice(0, 8)}`,
  };
}

export default async function KioskEventPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await verifyKioskSession();

  if (!session || session.token !== token) {
    redirect(`/kiosk/login?token=${token}`);
  }

  const event = session.kioskEvent;

  return (
    <KioskCheckInClient
      token={token}
      sessionName={session.name}
      initialAttendanceCount={session._count.attendances}
      language="ja"
      event={
        event
          ? {
              name: event.name,
              nameEn: event.nameEn,
              date: event.date.toISOString(),
              startTime: event.startTime?.toISOString() ?? null,
              endTime: event.endTime?.toISOString() ?? null,
              location: event.location,
              capacity: event.capacity,
            }
          : null
      }
    />
  );
}

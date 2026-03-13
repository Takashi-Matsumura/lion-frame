import { redirect } from "next/navigation";

export default function HolidaysPage() {
  redirect("/admin/calendar-management?tab=holidays");
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { SystemEventService } = await import(
      "@/lib/services/system-event-service"
    );
    await SystemEventService.handleBuildIdChange();
  }
}

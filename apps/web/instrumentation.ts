export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { SystemEventService } = await import(
      "@/lib/services/system-event-service"
    );
    await SystemEventService.handleBuildIdChange();

    const { startDependencyCron } = await import(
      "@/lib/core-modules/system/services/dependency-cron"
    );
    startDependencyCron();

    const { startOidcCleanupCron } = await import(
      "@/lib/services/oidc/cleanup"
    );
    startOidcCleanupCron();
  }
}

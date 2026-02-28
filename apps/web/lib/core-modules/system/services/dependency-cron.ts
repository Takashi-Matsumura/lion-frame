import cron from "node-cron";

let task: cron.ScheduledTask | null = null;

/**
 * 依存関係チェックのcronジョブを開始
 * 毎日2:00 AM JST（UTC 17:00）に実行
 */
export function startDependencyCron() {
  if (task) return; // 二重起動防止

  // 毎日 JST 02:00 = UTC 17:00（前日）
  task = cron.schedule(
    "0 17 * * *",
    async () => {
      console.log("[DependencyCron] Starting scheduled dependency check...");
      try {
        const { runDependencyCheck } = await import(
          "./dependency-check-service"
        );
        await runDependencyCheck({ trigger: "scheduled" });
        console.log("[DependencyCron] Scheduled check completed.");
      } catch (error) {
        console.error("[DependencyCron] Scheduled check failed:", error);
      }
    },
    { timezone: "UTC" },
  );

  console.log("[DependencyCron] Cron job scheduled (daily at 02:00 JST).");
}

export function stopDependencyCron() {
  if (task) {
    task.stop();
    task = null;
  }
}

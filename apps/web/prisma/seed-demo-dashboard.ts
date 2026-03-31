/**
 * デモ用ダッシュボードデータのシード
 * 名刺スクリーンショット用に、活発な組織の利用状況を生成する
 *
 * 使い方: cd apps/web && npx tsx prisma/seed-demo-dashboard.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 乱数ヘルパー
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🎨 Seeding demo dashboard data...");

  // 1. 全ユーザを取得（GUEST除く）
  const users = await prisma.user.findMany({
    where: { role: { not: "GUEST" } },
    select: { id: true, email: true, role: true },
  });

  if (users.length === 0) {
    console.error("❌ No users found. Run the main seed first.");
    return;
  }

  console.log(`Found ${users.length} users`);

  // ユーザーをアクティビティレベルで分類
  const heavyUsers = users.slice(0, Math.ceil(users.length * 0.3)); // 30% ヘビーユーザ
  const regularUsers = users.slice(
    Math.ceil(users.length * 0.3),
    Math.ceil(users.length * 0.8)
  ); // 50% 通常ユーザ
  const lightUsers = users.slice(Math.ceil(users.length * 0.8)); // 20% ライトユーザ

  // 2. 既存のデモデータをクリア
  const demoMarker = "demo-dashboard-seed";
  await prisma.auditLog.deleteMany({
    where: { userAgent: demoMarker },
  });
  await prisma.usageLog.deleteMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
      path: { not: "" },
    },
  });
  // UsageLog全件削除（デモ用なので安全）
  await prisma.usageLog.deleteMany({});

  console.log("Cleared existing demo data");

  // 3. 過去30日分のログインログを生成
  const now = new Date();
  const loginLogs: {
    action: string;
    category: string;
    userId: string;
    details: string;
    userAgent: string;
    createdAt: Date;
  }[] = [];

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    // 平日かどうか（0=日, 6=土）
    const dayOfWeek = date.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    // ヘビーユーザ: 平日ほぼ毎日、休日も50%
    for (const user of heavyUsers) {
      if (isWeekday || Math.random() < 0.5) {
        const loginTime = new Date(date);
        loginTime.setHours(randInt(8, 10), randInt(0, 59), randInt(0, 59));
        loginLogs.push({
          action: "LOGIN_SUCCESS",
          category: "AUTH",
          userId: user.id,
          details: JSON.stringify({ method: "credentials" }),
          userAgent: demoMarker,
          createdAt: loginTime,
        });
      }
    }

    // 通常ユーザ: 平日80%、休日20%
    for (const user of regularUsers) {
      if ((isWeekday && Math.random() < 0.8) || (!isWeekday && Math.random() < 0.2)) {
        const loginTime = new Date(date);
        loginTime.setHours(randInt(8, 11), randInt(0, 59), randInt(0, 59));
        loginLogs.push({
          action: "LOGIN_SUCCESS",
          category: "AUTH",
          userId: user.id,
          details: JSON.stringify({ method: "credentials" }),
          userAgent: demoMarker,
          createdAt: loginTime,
        });
      }
    }

    // ライトユーザ: 平日40%、休日5%
    for (const user of lightUsers) {
      if ((isWeekday && Math.random() < 0.4) || (!isWeekday && Math.random() < 0.05)) {
        const loginTime = new Date(date);
        loginTime.setHours(randInt(9, 14), randInt(0, 59), randInt(0, 59));
        loginLogs.push({
          action: "LOGIN_SUCCESS",
          category: "AUTH",
          userId: user.id,
          details: JSON.stringify({ method: "credentials" }),
          userAgent: demoMarker,
          createdAt: loginTime,
        });
      }
    }
  }

  await prisma.auditLog.createMany({ data: loginLogs });
  console.log(`Created ${loginLogs.length} login logs`);

  // 4. ページアクセスログを生成
  const pagePaths = [
    { path: "/dashboard", weight: 5 },
    { path: "/organization-chart", weight: 4 },
    { path: "/ai-chat", weight: 4 },
    { path: "/calendar", weight: 3 },
    { path: "/editor", weight: 3 },
    { path: "/form-builder", weight: 2 },
    { path: "/health-checkup", weight: 2 },
    { path: "/handson", weight: 2 },
    { path: "/admin/system", weight: 1 },
    { path: "/admin/users", weight: 1 },
    { path: "/manager/evaluation", weight: 2 },
    { path: "/groups", weight: 2 },
  ];

  const usageLogs: {
    userId: string;
    path: string;
    createdAt: Date;
  }[] = [];

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dayOfWeek = date.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (!isWeekday && Math.random() < 0.7) continue; // 休日はアクセス少ない

    // ログインしたユーザだけがアクセスする
    const loginUsersToday = loginLogs
      .filter(
        (l) =>
          l.createdAt.toISOString().slice(0, 10) ===
          date.toISOString().slice(0, 10)
      )
      .map((l) => l.userId);
    const uniqueLoginUsers = [...new Set(loginUsersToday)];

    for (const userId of uniqueLoginUsers) {
      // 各ユーザが1日にアクセスするページ数
      const pageVisits = randInt(2, 8);
      for (let i = 0; i < pageVisits; i++) {
        // 重み付きランダム選択
        const totalWeight = pagePaths.reduce((s, p) => s + p.weight, 0);
        let r = Math.random() * totalWeight;
        let selected = pagePaths[0];
        for (const p of pagePaths) {
          r -= p.weight;
          if (r <= 0) {
            selected = p;
            break;
          }
        }

        const accessTime = new Date(date);
        accessTime.setHours(randInt(8, 18), randInt(0, 59), randInt(0, 59));
        usageLogs.push({
          userId,
          path: selected.path,
          createdAt: accessTime,
        });
      }
    }
  }

  // バッチ挿入（500件ずつ）
  for (let i = 0; i < usageLogs.length; i += 500) {
    await prisma.usageLog.createMany({
      data: usageLogs.slice(i, i + 500),
    });
  }
  console.log(`Created ${usageLogs.length} usage logs`);

  // 5. AIチャットメッセージログを生成
  const aiChatLogs: {
    action: string;
    category: string;
    userId: string;
    details: string;
    userAgent: string;
    createdAt: Date;
  }[] = [];

  // AI利用者は全体の60%
  const aiUsers = users.filter(() => Math.random() < 0.6);

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // 休日はスキップ

    for (const user of aiUsers) {
      if (Math.random() < 0.4) continue; // 毎日使うわけではない
      const msgCount = randInt(1, 6);
      for (let m = 0; m < msgCount; m++) {
        const msgTime = new Date(date);
        msgTime.setHours(randInt(9, 17), randInt(0, 59), randInt(0, 59));
        aiChatLogs.push({
          action: "AI_CHAT_MESSAGE",
          category: "AI",
          userId: user.id,
          details: JSON.stringify({ type: "user_message" }),
          userAgent: demoMarker,
          createdAt: msgTime,
        });
      }
    }
  }

  await prisma.auditLog.createMany({ data: aiChatLogs });
  console.log(`Created ${aiChatLogs.length} AI chat logs`);

  // 6. 結果サマリ
  const wauUsers = new Set(
    loginLogs
      .filter(
        (l) => l.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      .map((l) => l.userId)
  );
  const mauUsers = new Set(loginLogs.map((l) => l.userId));
  const aiUniqueUsers = new Set(aiChatLogs.map((l) => l.userId));

  console.log("\n📊 Dashboard preview:");
  console.log(`  WAU: ${wauUsers.size}`);
  console.log(`  MAU: ${mauUsers.size}`);
  console.log(`  Total page views: ${usageLogs.length}`);
  console.log(`  AI messages: ${aiChatLogs.length}`);
  console.log(`  AI unique users: ${aiUniqueUsers.size}`);
  console.log("\n✅ Demo dashboard data seeded!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

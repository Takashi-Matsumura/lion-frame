/**
 * サンプル組織データのシード
 * 中小企業（50名）の組織・社員データを投入する
 *
 * 使い方: cd apps/web && npx tsx prisma/seed-sample-org.ts
 *
 * --clean オプションで既存サンプルデータを削除してから再投入
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_NAME = "株式会社ABC商事";
const SAMPLE_EMAIL_DOMAIN = "@abc.com";
const EMPLOYEE_ID_PREFIX = "E0";

async function cleanup() {
  console.log("🧹 Cleaning up existing sample data...");

  const org = await prisma.organization.findUnique({ where: { name: ORG_NAME } });
  if (!org) {
    console.log("  No existing organization found, skipping cleanup.");
    return;
  }

  // Delete employees (cascades supervisor refs via SET NULL)
  // First clear self-references
  await prisma.employee.updateMany({
    where: { organizationId: org.id },
    data: { supervisorId: null, deputyId: null },
  });

  // Clear manager references from sections/departments
  await prisma.section.updateMany({
    where: { department: { organizationId: org.id } },
    data: { managerId: null },
  });
  await prisma.department.updateMany({
    where: { organizationId: org.id },
    data: { managerId: null, executiveId: null },
  });

  // Delete employees
  const deletedEmps = await prisma.employee.deleteMany({ where: { organizationId: org.id } });
  console.log(`  Deleted ${deletedEmps.count} employees`);

  // Delete organization (cascades departments → sections → courses)
  await prisma.organization.delete({ where: { id: org.id } });
  console.log(`  Deleted organization: ${ORG_NAME}`);

  // Delete sample user accounts (e001~e050)
  // 旧ドメイン(@lionframe.local)と現行ドメインの両方をクリーンアップ
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "e0", endsWith: SAMPLE_EMAIL_DOMAIN } },
        { email: { startsWith: "e0", endsWith: "@lionframe.local" } },
      ],
      role: { not: "ADMIN" },
    },
  });
  console.log(`  Deleted ${deletedUsers.count} user accounts`);
}

async function main() {
  console.log("🏢 Seeding sample organization data...");

  // Always clean up first for idempotent runs
  await cleanup();

  const hashedPassword = await bcrypt.hash("password", 10);

  // --- Organization ---
  const org = await prisma.organization.create({
    data: {
      name: ORG_NAME,
      description: "総合商社として幅広い事業を展開する中小企業",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  console.log(`Organization: ${org.name} (${org.id})`);

  // --- Departments ---
  const deptData = [
    { name: "取締役・顧問", code: "D000", description: "取締役会・経営顧問" },
    { name: "経営企画本部", code: "D001", description: "経営戦略の立案・推進" },
    { name: "総務部", code: "D002", description: "総務・人事・庶務全般" },
    { name: "営業部", code: "D003", description: "国内外の営業活動" },
    { name: "財務会計部", code: "D004", description: "財務・経理・予算管理" },
    { name: "技術部", code: "D005", description: "製品開発・IT基盤管理" },
    { name: "品質管理部", code: "D006", description: "品質保証・検査業務" },
  ];

  const depts: Record<string, string> = {};
  for (const d of deptData) {
    const dept = await prisma.department.create({
      data: { ...d, organizationId: org.id },
    });
    depts[d.name] = dept.id;
  }
  console.log(`Departments: ${Object.keys(depts).length}`);

  // --- Sections ---
  const sectionData = [
    { name: "経営企画課", code: "S001", departmentName: "経営企画本部" },
    { name: "総務課", code: "S002", departmentName: "総務部" },
    { name: "人事課", code: "S003", departmentName: "総務部" },
    { name: "第一営業課", code: "S004", departmentName: "営業部" },
    { name: "第二営業課", code: "S005", departmentName: "営業部" },
    { name: "経理課", code: "S006", departmentName: "財務会計部" },
    { name: "財務課", code: "S007", departmentName: "財務会計部" },
    { name: "開発課", code: "S008", departmentName: "技術部" },
    { name: "インフラ課", code: "S009", departmentName: "技術部" },
    { name: "品質管理課", code: "S010", departmentName: "品質管理部" },
  ];

  const sections: Record<string, { id: string; departmentId: string }> = {};
  for (const s of sectionData) {
    const departmentId = depts[s.departmentName];
    const section = await prisma.section.create({
      data: { name: s.name, code: s.code, departmentId },
    });
    sections[s.name] = { id: section.id, departmentId };
  }
  console.log(`Sections: ${Object.keys(sections).length}`);

  // --- Position code map ---
  const POS = {
    社長: "001",
    取締役: "005",
    顧問: "900",
    部長: "200",
    課長: "300",
    リーダー: "501",
    主任: "500",
    一般: "000",
  };

  // --- Employee definitions ---
  type EmpDef = {
    employeeId: string;
    name: string;
    nameKana: string;
    position: string;
    positionCode: string;
    departmentName: string;
    sectionName?: string;
    role: "EXECUTIVE" | "MANAGER" | "USER";
    joinDate: string;
  };

  const employees: EmpDef[] = [
    // 取締役・顧問
    { employeeId: "E001", name: "山田 太郎", nameKana: "ヤマダ タロウ", position: "社長", positionCode: POS.社長, departmentName: "取締役・顧問", role: "EXECUTIVE", joinDate: "2000-04-01" },
    { employeeId: "E002", name: "佐藤 健一", nameKana: "サトウ ケンイチ", position: "取締役", positionCode: POS.取締役, departmentName: "取締役・顧問", role: "EXECUTIVE", joinDate: "2002-04-01" },
    { employeeId: "E003", name: "西村 和夫", nameKana: "ニシムラ カズオ", position: "顧問", positionCode: POS.顧問, departmentName: "取締役・顧問", role: "EXECUTIVE", joinDate: "1995-04-01" },

    // 経営企画本部
    { employeeId: "E004", name: "鈴木 美咲", nameKana: "スズキ ミサキ", position: "主任", positionCode: POS.主任, departmentName: "経営企画本部", sectionName: "経営企画課", role: "USER", joinDate: "2015-04-01" },
    { employeeId: "E005", name: "高橋 翔太", nameKana: "タカハシ ショウタ", position: "一般", positionCode: POS.一般, departmentName: "経営企画本部", sectionName: "経営企画課", role: "USER", joinDate: "2021-04-01" },

    // 総務部
    { employeeId: "E006", name: "田中 洋子", nameKana: "タナカ ヨウコ", position: "部長", positionCode: POS.部長, departmentName: "総務部", role: "MANAGER", joinDate: "2005-04-01" },
    { employeeId: "E007", name: "伊藤 誠", nameKana: "イトウ マコト", position: "課長", positionCode: POS.課長, departmentName: "総務部", sectionName: "総務課", role: "MANAGER", joinDate: "2008-04-01" },
    { employeeId: "E008", name: "渡辺 花子", nameKana: "ワタナベ ハナコ", position: "主任", positionCode: POS.主任, departmentName: "総務部", sectionName: "総務課", role: "USER", joinDate: "2014-04-01" },
    { employeeId: "E009", name: "小林 大輔", nameKana: "コバヤシ ダイスケ", position: "一般", positionCode: POS.一般, departmentName: "総務部", sectionName: "総務課", role: "USER", joinDate: "2020-04-01" },
    { employeeId: "E010", name: "加藤 真由美", nameKana: "カトウ マユミ", position: "一般", positionCode: POS.一般, departmentName: "総務部", sectionName: "総務課", role: "USER", joinDate: "2022-04-01" },
    { employeeId: "E011", name: "吉田 隆", nameKana: "ヨシダ タカシ", position: "課長", positionCode: POS.課長, departmentName: "総務部", sectionName: "人事課", role: "MANAGER", joinDate: "2009-04-01" },
    { employeeId: "E012", name: "山口 さくら", nameKana: "ヤマグチ サクラ", position: "主任", positionCode: POS.主任, departmentName: "総務部", sectionName: "人事課", role: "USER", joinDate: "2016-04-01" },
    { employeeId: "E013", name: "松本 亮介", nameKana: "マツモト リョウスケ", position: "一般", positionCode: POS.一般, departmentName: "総務部", sectionName: "人事課", role: "USER", joinDate: "2023-04-01" },

    // 営業部
    { employeeId: "E014", name: "井上 正義", nameKana: "イノウエ マサヨシ", position: "部長", positionCode: POS.部長, departmentName: "営業部", role: "MANAGER", joinDate: "2004-04-01" },
    { employeeId: "E015", name: "木村 達也", nameKana: "キムラ タツヤ", position: "課長", positionCode: POS.課長, departmentName: "営業部", sectionName: "第一営業課", role: "MANAGER", joinDate: "2010-04-01" },
    { employeeId: "E016", name: "林 雄太", nameKana: "ハヤシ ユウタ", position: "リーダー", positionCode: POS.リーダー, departmentName: "営業部", sectionName: "第一営業課", role: "USER", joinDate: "2015-04-01" },
    { employeeId: "E017", name: "清水 愛", nameKana: "シミズ アイ", position: "一般", positionCode: POS.一般, departmentName: "営業部", sectionName: "第一営業課", role: "USER", joinDate: "2019-04-01" },
    { employeeId: "E018", name: "山崎 健太", nameKana: "ヤマザキ ケンタ", position: "一般", positionCode: POS.一般, departmentName: "営業部", sectionName: "第一営業課", role: "USER", joinDate: "2022-04-01" },
    { employeeId: "E019", name: "森田 麻衣", nameKana: "モリタ マイ", position: "一般", positionCode: POS.一般, departmentName: "営業部", sectionName: "第一営業課", role: "USER", joinDate: "2024-04-01" },
    { employeeId: "E020", name: "阿部 浩二", nameKana: "アベ コウジ", position: "課長", positionCode: POS.課長, departmentName: "営業部", sectionName: "第二営業課", role: "MANAGER", joinDate: "2011-04-01" },
    { employeeId: "E021", name: "石川 恵理", nameKana: "イシカワ エリ", position: "リーダー", positionCode: POS.リーダー, departmentName: "営業部", sectionName: "第二営業課", role: "USER", joinDate: "2016-04-01" },
    { employeeId: "E022", name: "前田 翼", nameKana: "マエダ ツバサ", position: "一般", positionCode: POS.一般, departmentName: "営業部", sectionName: "第二営業課", role: "USER", joinDate: "2021-04-01" },
    { employeeId: "E023", name: "藤田 由紀", nameKana: "フジタ ユキ", position: "一般", positionCode: POS.一般, departmentName: "営業部", sectionName: "第二営業課", role: "USER", joinDate: "2023-04-01" },

    // 財務会計部
    { employeeId: "E024", name: "中川 博文", nameKana: "ナカガワ ヒロフミ", position: "部長", positionCode: POS.部長, departmentName: "財務会計部", role: "MANAGER", joinDate: "2003-04-01" },
    { employeeId: "E025", name: "橋本 結衣", nameKana: "ハシモト ユイ", position: "課長", positionCode: POS.課長, departmentName: "財務会計部", sectionName: "経理課", role: "MANAGER", joinDate: "2010-04-01" },
    { employeeId: "E026", name: "岡田 拓海", nameKana: "オカダ タクミ", position: "主任", positionCode: POS.主任, departmentName: "財務会計部", sectionName: "経理課", role: "USER", joinDate: "2017-04-01" },
    { employeeId: "E027", name: "後藤 真理", nameKana: "ゴトウ マリ", position: "一般", positionCode: POS.一般, departmentName: "財務会計部", sectionName: "経理課", role: "USER", joinDate: "2021-04-01" },
    { employeeId: "E028", name: "池田 圭介", nameKana: "イケダ ケイスケ", position: "一般", positionCode: POS.一般, departmentName: "財務会計部", sectionName: "経理課", role: "USER", joinDate: "2024-04-01" },
    { employeeId: "E029", name: "久保田 恵", nameKana: "クボタ メグミ", position: "課長", positionCode: POS.課長, departmentName: "財務会計部", sectionName: "財務課", role: "MANAGER", joinDate: "2012-04-01" },
    { employeeId: "E030", name: "平野 慎一", nameKana: "ヒラノ シンイチ", position: "主任", positionCode: POS.主任, departmentName: "財務会計部", sectionName: "財務課", role: "USER", joinDate: "2018-04-01" },
    { employeeId: "E031", name: "杉山 彩", nameKana: "スギヤマ アヤ", position: "一般", positionCode: POS.一般, departmentName: "財務会計部", sectionName: "財務課", role: "USER", joinDate: "2022-04-01" },

    // 技術部
    { employeeId: "E032", name: "中村 剛", nameKana: "ナカムラ ツヨシ", position: "部長", positionCode: POS.部長, departmentName: "技術部", role: "MANAGER", joinDate: "2006-04-01" },
    { employeeId: "E033", name: "三浦 光一", nameKana: "ミウラ コウイチ", position: "課長", positionCode: POS.課長, departmentName: "技術部", sectionName: "開発課", role: "MANAGER", joinDate: "2011-04-01" },
    { employeeId: "E034", name: "藤井 瞳", nameKana: "フジイ ヒトミ", position: "リーダー", positionCode: POS.リーダー, departmentName: "技術部", sectionName: "開発課", role: "USER", joinDate: "2015-04-01" },
    { employeeId: "E035", name: "岡本 悠", nameKana: "オカモト ユウ", position: "主任", positionCode: POS.主任, departmentName: "技術部", sectionName: "開発課", role: "USER", joinDate: "2017-04-01" },
    { employeeId: "E036", name: "長谷川 蓮", nameKana: "ハセガワ レン", position: "一般", positionCode: POS.一般, departmentName: "技術部", sectionName: "開発課", role: "USER", joinDate: "2020-04-01" },
    { employeeId: "E037", name: "村上 遥", nameKana: "ムラカミ ハルカ", position: "一般", positionCode: POS.一般, departmentName: "技術部", sectionName: "開発課", role: "USER", joinDate: "2021-04-01" },
    { employeeId: "E038", name: "近藤 陸", nameKana: "コンドウ リク", position: "一般", positionCode: POS.一般, departmentName: "技術部", sectionName: "開発課", role: "USER", joinDate: "2023-04-01" },
    { employeeId: "E039", name: "坂本 七海", nameKana: "サカモト ナナミ", position: "一般", positionCode: POS.一般, departmentName: "技術部", sectionName: "開発課", role: "USER", joinDate: "2024-04-01" },
    { employeeId: "E040", name: "原田 智子", nameKana: "ハラダ トモコ", position: "課長", positionCode: POS.課長, departmentName: "技術部", sectionName: "インフラ課", role: "MANAGER", joinDate: "2012-04-01" },
    { employeeId: "E041", name: "松田 裕也", nameKana: "マツダ ユウヤ", position: "リーダー", positionCode: POS.リーダー, departmentName: "技術部", sectionName: "インフラ課", role: "USER", joinDate: "2016-04-01" },
    { employeeId: "E042", name: "石井 凛", nameKana: "イシイ リン", position: "一般", positionCode: POS.一般, departmentName: "技術部", sectionName: "インフラ課", role: "USER", joinDate: "2020-04-01" },
    { employeeId: "E043", name: "中島 拓実", nameKana: "ナカジマ タクミ", position: "一般", positionCode: POS.一般, departmentName: "技術部", sectionName: "インフラ課", role: "USER", joinDate: "2022-04-01" },
    { employeeId: "E044", name: "小川 美月", nameKana: "オガワ ミヅキ", position: "一般", positionCode: POS.一般, departmentName: "技術部", sectionName: "インフラ課", role: "USER", joinDate: "2024-04-01" },

    // 品質管理部
    { employeeId: "E045", name: "斎藤 勇気", nameKana: "サイトウ ユウキ", position: "部長", positionCode: POS.部長, departmentName: "品質管理部", role: "MANAGER", joinDate: "2007-04-01" },
    { employeeId: "E046", name: "太田 香織", nameKana: "オオタ カオリ", position: "課長", positionCode: POS.課長, departmentName: "品質管理部", sectionName: "品質管理課", role: "MANAGER", joinDate: "2013-04-01" },
    { employeeId: "E047", name: "酒井 修平", nameKana: "サカイ シュウヘイ", position: "主任", positionCode: POS.主任, departmentName: "品質管理部", sectionName: "品質管理課", role: "USER", joinDate: "2018-04-01" },
    { employeeId: "E048", name: "野村 春菜", nameKana: "ノムラ ハルナ", position: "一般", positionCode: POS.一般, departmentName: "品質管理部", sectionName: "品質管理課", role: "USER", joinDate: "2021-04-01" },
    { employeeId: "E049", name: "上田 響", nameKana: "ウエダ ヒビキ", position: "一般", positionCode: POS.一般, departmentName: "品質管理部", sectionName: "品質管理課", role: "USER", joinDate: "2023-04-01" },
    { employeeId: "E050", name: "工藤 あかり", nameKana: "クドウ アカリ", position: "一般", positionCode: POS.一般, departmentName: "品質管理部", sectionName: "品質管理課", role: "USER", joinDate: "2025-04-01" },
  ];

  // --- Create Employees ---
  const empIds: Record<string, string> = {};

  for (const e of employees) {
    const departmentId = depts[e.departmentName];
    const sectionId = e.sectionName ? sections[e.sectionName].id : undefined;
    const email = `${e.employeeId.toLowerCase()}${SAMPLE_EMAIL_DOMAIN}`;

    const emp = await prisma.employee.create({
      data: {
        employeeId: e.employeeId,
        name: e.name,
        nameKana: e.nameKana,
        email,
        position: e.position,
        positionCode: e.positionCode,
        joinDate: new Date(e.joinDate),
        isActive: true,
        organizationId: org.id,
        departmentId,
        sectionId: sectionId ?? null,
      },
    });
    empIds[e.employeeId] = emp.id;
  }
  console.log(`Employees: ${Object.keys(empIds).length}`);

  // --- Set department managers & executive ---
  const deptManagers: Record<string, { managerId?: string; executiveId?: string }> = {
    "取締役・顧問": { managerId: empIds["E001"], executiveId: empIds["E001"] },
    経営企画本部: { managerId: empIds["E004"], executiveId: empIds["E002"] },
    総務部: { managerId: empIds["E006"], executiveId: empIds["E002"] },
    営業部: { managerId: empIds["E014"], executiveId: empIds["E002"] },
    財務会計部: { managerId: empIds["E024"], executiveId: empIds["E002"] },
    技術部: { managerId: empIds["E032"], executiveId: empIds["E002"] },
    品質管理部: { managerId: empIds["E045"], executiveId: empIds["E002"] },
  };

  for (const [deptName, ids] of Object.entries(deptManagers)) {
    await prisma.department.update({
      where: { id: depts[deptName] },
      data: { managerId: ids.managerId ?? null, executiveId: ids.executiveId ?? null },
    });
  }

  // --- Set section managers ---
  const sectionManagers: Record<string, string> = {
    経営企画課: empIds["E004"],
    総務課: empIds["E007"],
    人事課: empIds["E011"],
    第一営業課: empIds["E015"],
    第二営業課: empIds["E020"],
    経理課: empIds["E025"],
    財務課: empIds["E029"],
    開発課: empIds["E033"],
    インフラ課: empIds["E040"],
    品質管理課: empIds["E046"],
  };

  for (const [secName, managerId] of Object.entries(sectionManagers)) {
    await prisma.section.update({
      where: { id: sections[secName].id },
      data: { managerId },
    });
  }

  // --- Set supervisor relationships ---
  const supervisorMap: Record<string, string> = {
    // 取締役・顧問 → 社長
    E002: "E001",
    E003: "E001",
    // 部長 → 取締役
    E006: "E002", E014: "E002", E024: "E002", E032: "E002", E045: "E002",
    // 経営企画課メンバー → 取締役(管轄)
    E004: "E002", E005: "E004",
    // 課長 → 部長
    E007: "E006", E011: "E006",
    E015: "E014", E020: "E014",
    E025: "E024", E029: "E024",
    E033: "E032", E040: "E032",
    E046: "E045",
    // 総務課メンバー → 課長
    E008: "E007", E009: "E007", E010: "E007",
    // 人事課メンバー → 課長
    E012: "E011", E013: "E011",
    // 第一営業課メンバー → 課長
    E016: "E015", E017: "E015", E018: "E015", E019: "E015",
    // 第二営業課メンバー → 課長
    E021: "E020", E022: "E020", E023: "E020",
    // 経理課メンバー → 課長
    E026: "E025", E027: "E025", E028: "E025",
    // 財務課メンバー → 課長
    E030: "E029", E031: "E029",
    // 開発課メンバー → 課長
    E034: "E033", E035: "E033", E036: "E033", E037: "E033",
    E038: "E033", E039: "E033",
    // インフラ課メンバー → 課長
    E041: "E040", E042: "E040", E043: "E040", E044: "E040",
    // 品質管理課メンバー → 課長
    E047: "E046", E048: "E046", E049: "E046", E050: "E046",
  };

  for (const [empId, supId] of Object.entries(supervisorMap)) {
    await prisma.employee.update({
      where: { id: empIds[empId] },
      data: { supervisorId: empIds[supId] },
    });
  }

  // --- Create User accounts ---
  for (const e of employees) {
    const email = `${e.employeeId.toLowerCase()}${SAMPLE_EMAIL_DOMAIN}`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: e.name,
        role: e.role,
        emailVerified: new Date(),
        password: hashedPassword,
        language: "ja",
      },
    });
  }
  console.log(`Users: ${employees.length} accounts created`);

  console.log("\n✅ Sample organization seeded successfully!");
  console.log(`Company: ${ORG_NAME}`);
  console.log(`Employees: ${employees.length}`);
  console.log("Login: e001@lionframe.local ~ e050@lionframe.local / password");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

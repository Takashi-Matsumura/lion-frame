import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedManagerHistory(db: PrismaClient) {
  const existing = await db.managerHistory.count();
  if (existing > 0) return { skipped: true, created: 0 };

  // 最古の基準日を決定（ChangeLogまたは組織作成日のうち最古）
  const oldestChangeLog = await db.changeLog.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const oldestOrg = await db.organization.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const earliestDate = [oldestChangeLog?.createdAt, oldestOrg?.createdAt]
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())[0] || new Date();

  const records: { unitType: string; unitId: string; managerId: string | null }[] = [];

  const departments = await db.department.findMany({ select: { id: true, managerId: true } });
  for (const d of departments) records.push({ unitType: "department", unitId: d.id, managerId: d.managerId });

  const sections = await db.section.findMany({ select: { id: true, managerId: true } });
  for (const s of sections) records.push({ unitType: "section", unitId: s.id, managerId: s.managerId });

  const courses = await db.course.findMany({ select: { id: true, managerId: true } });
  for (const c of courses) records.push({ unitType: "course", unitId: c.id, managerId: c.managerId });

  if (records.length > 0) {
    await db.managerHistory.createMany({
      data: records.map((r) => ({
        unitType: r.unitType,
        unitId: r.unitId,
        managerId: r.managerId,
        validFrom: earliestDate,
        validTo: null,
        changeReason: "初期データ移行",
        changedBy: "system",
      })),
    });
  }

  return { skipped: false, created: records.length };
}

async function main() {
  console.log("🌱 Seeding database...");

  // Hash default admin password
  const hashedPassword = await bcrypt.hash("admin", 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@lionframe.local" },
    update: { password: hashedPassword },
    create: {
      email: "admin@lionframe.local",
      name: "System Administrator",
      role: "ADMIN",
      emailVerified: new Date(),
      password: hashedPassword,
    },
  });

  // Seed default position master data
  const defaultPositions = [
    { code: "001", name: "President", nameJa: "社長", level: "EXECUTIVE", isManager: true, color: "purple", displayOrder: 10, approvalLevel: 100 },
    { code: "005", name: "Director", nameJa: "取締役", level: "EXECUTIVE", isManager: true, color: "purple", displayOrder: 50, approvalLevel: 90 },
    { code: "010", name: "Executive Officer", nameJa: "執行役員", level: "EXECUTIVE", isManager: true, color: "purple", displayOrder: 70, approvalLevel: 80 },
    { code: "100", name: "Division Head", nameJa: "本部長", level: "DEPARTMENT", isManager: true, color: "purple", displayOrder: 100, approvalLevel: 70 },
    { code: "200", name: "Department Head", nameJa: "部長", level: "SECTION", isManager: true, color: "purple", displayOrder: 200, approvalLevel: 60 },
    { code: "201", name: "Office Head", nameJa: "室長", level: "SECTION", isManager: true, color: "purple", displayOrder: 210, approvalLevel: 60 },
    { code: "300", name: "Section Chief", nameJa: "課長", level: "COURSE", isManager: true, color: "cyan", displayOrder: 300, approvalLevel: 50 },
    { code: "301", name: "Group Leader", nameJa: "グループ長", level: "COURSE", isManager: true, color: "cyan", displayOrder: 310, approvalLevel: 50 },
    { code: "400", name: "Team Leader", nameJa: "チーム長", level: "COURSE", isManager: true, color: "cyan", displayOrder: 350, approvalLevel: 40 },
    { code: "500", name: "Senior Staff", nameJa: "主任", level: "SENIOR", isManager: false, color: "green", displayOrder: 500, approvalLevel: 30 },
    { code: "501", name: "Leader", nameJa: "リーダー", level: "SENIOR", isManager: false, color: "green", displayOrder: 510, approvalLevel: 30 },
    { code: "000", name: "Staff", nameJa: "一般", level: "STAFF", isManager: false, color: null, displayOrder: 9999, approvalLevel: 10 },
    { code: "900", name: "Advisor", nameJa: "顧問", level: "EXECUTIVE", isManager: false, color: "purple", displayOrder: 60, approvalLevel: 0 },
  ];

  for (const pos of defaultPositions) {
    await prisma.positionMaster.upsert({
      where: { code: pos.code },
      update: {
        name: pos.name,
        nameJa: pos.nameJa,
        level: pos.level,
        isManager: pos.isManager,
        color: pos.color,
        displayOrder: pos.displayOrder,
        approvalLevel: pos.approvalLevel,
      },
      create: pos,
    });
  }

  // Seed sample company events
  const currentYear = new Date().getFullYear();
  const companyEvents = [
    { title: "入社式", titleEn: "Entrance Ceremony", startDate: `${currentYear}-04-01`, endDate: `${currentYear}-04-01`, category: "event" },
    { title: "新人研修", titleEn: "New Employee Training", startDate: `${currentYear}-04-01`, endDate: `${currentYear}-04-14`, category: "period" },
    { title: "安全衛生委員会", titleEn: "Safety & Health Committee", startDate: `${currentYear}-04-15`, endDate: `${currentYear}-04-15`, category: "event" },
    { title: "第1四半期決算締め", titleEn: "Q1 Closing", startDate: `${currentYear}-06-30`, endDate: `${currentYear}-06-30`, category: "deadline" },
    { title: "株主総会", titleEn: "General Shareholders Meeting", startDate: `${currentYear}-06-25`, endDate: `${currentYear}-06-25`, category: "event" },
    { title: "夏季休暇", titleEn: "Summer Holiday", startDate: `${currentYear}-08-13`, endDate: `${currentYear}-08-16`, category: "period" },
    { title: "上期人事考課提出", titleEn: "1H Performance Review Deadline", startDate: `${currentYear}-09-30`, endDate: `${currentYear}-09-30`, category: "deadline" },
    { title: "第2四半期決算締め", titleEn: "Q2 Closing", startDate: `${currentYear}-09-30`, endDate: `${currentYear}-09-30`, category: "deadline" },
    { title: "防災訓練", titleEn: "Disaster Drill", startDate: `${currentYear}-09-01`, endDate: `${currentYear}-09-01`, category: "event" },
    { title: "社員旅行", titleEn: "Company Trip", startDate: `${currentYear}-10-10`, endDate: `${currentYear}-10-11`, category: "event" },
    { title: "第3四半期決算締め", titleEn: "Q3 Closing", startDate: `${currentYear}-12-31`, endDate: `${currentYear}-12-31`, category: "deadline" },
    { title: "年末年始休暇", titleEn: "Year-End / New Year Holiday", startDate: `${currentYear}-12-28`, endDate: `${currentYear + 1}-01-05`, category: "period" },
    { title: "下期人事考課提出", titleEn: "2H Performance Review Deadline", startDate: `${currentYear + 1}-03-15`, endDate: `${currentYear + 1}-03-15`, category: "deadline" },
    { title: "期末決算締め", titleEn: "Year-End Closing", startDate: `${currentYear + 1}-03-31`, endDate: `${currentYear + 1}-03-31`, category: "deadline" },
    { title: "創立記念日", titleEn: "Foundation Day", startDate: `${currentYear}-11-01`, endDate: `${currentYear}-11-01`, category: "event" },
  ];

  let companyEventCount = 0;
  for (const ev of companyEvents) {
    const existing = await prisma.companyEvent.findFirst({
      where: { title: ev.title, startDate: new Date(ev.startDate) },
    });
    if (!existing) {
      await prisma.companyEvent.create({
        data: {
          title: ev.title,
          titleEn: ev.titleEn,
          startDate: new Date(ev.startDate),
          endDate: new Date(ev.endDate),
          category: ev.category,
        },
      });
      companyEventCount++;
    }
  }

  // Seed workflow templates
  const workflowTemplates = [
    {
      type: "leave",
      name: "Leave Request",
      nameJa: "休暇申請",
      description: "Request for annual leave, personal leave, etc.",
      descriptionJa: "年次休暇・特別休暇等の申請",
      approvalSteps: 1,
      formSchema: {
        fields: [
          { name: "startDate", type: "date", label: "Start Date", labelJa: "開始日", required: true },
          { name: "endDate", type: "date", label: "End Date", labelJa: "終了日", required: true },
          { name: "leaveType", type: "select", label: "Leave Type", labelJa: "休暇種別", required: true, options: [
            { value: "annual", label: "Annual Leave", labelJa: "年次休暇" },
            { value: "special", label: "Special Leave", labelJa: "特別休暇" },
            { value: "sick", label: "Sick Leave", labelJa: "病気休暇" },
          ]},
          { name: "reason", type: "textarea", label: "Reason", labelJa: "理由", required: false },
        ],
      },
    },
    {
      type: "expense",
      name: "Expense Report",
      nameJa: "経費精算",
      description: "Submit expense reports for reimbursement",
      descriptionJa: "経費の精算申請",
      approvalSteps: 2,
      formSchema: {
        fields: [
          { name: "expenseDate", type: "date", label: "Expense Date", labelJa: "発生日", required: true },
          { name: "amount", type: "number", label: "Amount (JPY)", labelJa: "金額（円）", required: true },
          { name: "category", type: "select", label: "Category", labelJa: "費目", required: true, options: [
            { value: "transportation", label: "Transportation", labelJa: "交通費" },
            { value: "meal", label: "Meal / Entertainment", labelJa: "飲食・接待費" },
            { value: "supplies", label: "Office Supplies", labelJa: "事務用品費" },
            { value: "other", label: "Other", labelJa: "その他" },
          ]},
          { name: "description", type: "textarea", label: "Description", labelJa: "内容", required: true },
        ],
      },
    },
    {
      type: "purchase",
      name: "Purchase Request",
      nameJa: "購買申請",
      description: "Request for purchasing items or services",
      descriptionJa: "物品・サービスの購入申請",
      approvalSteps: 2,
      formSchema: {
        fields: [
          { name: "itemName", type: "text", label: "Item Name", labelJa: "品名", required: true },
          { name: "quantity", type: "number", label: "Quantity", labelJa: "数量", required: true },
          { name: "unitPrice", type: "number", label: "Unit Price (JPY)", labelJa: "単価（円）", required: true },
          { name: "purpose", type: "textarea", label: "Purpose", labelJa: "用途", required: true },
          { name: "supplier", type: "text", label: "Supplier", labelJa: "仕入先", required: false },
        ],
      },
    },
    {
      type: "overtime",
      name: "Overtime Request",
      nameJa: "残業申請",
      description: "Request for overtime work approval",
      descriptionJa: "残業の事前申請",
      approvalSteps: 1,
      formSchema: {
        fields: [
          { name: "overtimeDate", type: "date", label: "Date", labelJa: "残業日", required: true },
          { name: "startTime", type: "time", label: "Start Time", labelJa: "開始時刻", required: true },
          { name: "endTime", type: "time", label: "End Time", labelJa: "終了時刻", required: true },
          { name: "reason", type: "textarea", label: "Reason", labelJa: "理由", required: true },
        ],
      },
    },
  ];

  let workflowTemplateCount = 0;
  for (const tmpl of workflowTemplates) {
    await prisma.workflowTemplate.upsert({
      where: { type: tmpl.type },
      update: {
        name: tmpl.name,
        nameJa: tmpl.nameJa,
        description: tmpl.description,
        descriptionJa: tmpl.descriptionJa,
        approvalSteps: tmpl.approvalSteps,
        formSchema: tmpl.formSchema,
      },
      create: tmpl,
    });
    workflowTemplateCount++;
  }

  // Seed ManagerHistory from current state
  const managerHistoryResult = await seedManagerHistory(prisma);

  console.log("✅ Database seeded successfully!");
  console.log("Created admin user:");
  console.log(`  - ${admin.email} (${admin.role})`);
  console.log(`Seeded ${defaultPositions.length} position master records`);
  console.log(`Seeded ${companyEventCount} company events`);
  console.log(`Seeded ${workflowTemplateCount} workflow templates`);
  if (managerHistoryResult.skipped) {
    console.log("ManagerHistory: already seeded, skipped");
  } else {
    console.log(`Seeded ${managerHistoryResult.created} manager history records`);
  }
  console.log("\nCredentials login:");
  console.log("  - Email: admin@lionframe.local");
  console.log("  - Password: admin");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

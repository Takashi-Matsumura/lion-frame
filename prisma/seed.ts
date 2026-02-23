import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    { code: "001", name: "President", nameJa: "社長", level: "EXECUTIVE", isManager: true, color: "purple", displayOrder: 10 },
    { code: "005", name: "Director", nameJa: "取締役", level: "EXECUTIVE", isManager: true, color: "purple", displayOrder: 50 },
    { code: "010", name: "Executive Officer", nameJa: "執行役員", level: "EXECUTIVE", isManager: true, color: "purple", displayOrder: 70 },
    { code: "100", name: "Division Head", nameJa: "本部長", level: "DEPARTMENT", isManager: true, color: "purple", displayOrder: 100 },
    { code: "200", name: "Department Head", nameJa: "部長", level: "SECTION", isManager: true, color: "purple", displayOrder: 200 },
    { code: "201", name: "Office Head", nameJa: "室長", level: "SECTION", isManager: true, color: "purple", displayOrder: 210 },
    { code: "300", name: "Section Chief", nameJa: "課長", level: "COURSE", isManager: true, color: "cyan", displayOrder: 300 },
    { code: "301", name: "Group Leader", nameJa: "グループ長", level: "COURSE", isManager: true, color: "cyan", displayOrder: 310 },
    { code: "400", name: "Team Leader", nameJa: "チーム長", level: "COURSE", isManager: true, color: "cyan", displayOrder: 350 },
    { code: "500", name: "Senior Staff", nameJa: "主任", level: "SENIOR", isManager: false, color: "green", displayOrder: 500 },
    { code: "501", name: "Leader", nameJa: "リーダー", level: "SENIOR", isManager: false, color: "green", displayOrder: 510 },
    { code: "000", name: "Staff", nameJa: "一般", level: "STAFF", isManager: false, color: null, displayOrder: 9999 },
    { code: "900", name: "Advisor", nameJa: "顧問", level: "EXECUTIVE", isManager: false, color: "purple", displayOrder: 900 },
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
      },
      create: pos,
    });
  }

  console.log("✅ Database seeded successfully!");
  console.log("Created admin user:");
  console.log(`  - ${admin.email} (${admin.role})`);
  console.log(`Seeded ${defaultPositions.length} position master records`);
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

import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api/api-handler";

interface ChainNode {
  name: string;
  position: string;
  department: string;
  deputyName: string | null;
}

export const GET = apiHandler(async (_request, session) => {
  const email = session.user?.email ?? "";

  // ログインユーザの従業員情報
  const employee = email
    ? await prisma.employee.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          position: true,
          department: { select: { name: true } },
          section: { select: { name: true } },
          supervisorId: true,
        },
      })
    : null;

  // 承認チェーン構築ヘルパー
  async function buildChainWithDetails(startId: string, maxSteps: number): Promise<ChainNode[]> {
    const chain: ChainNode[] = [];
    let currentId = startId;

    for (let i = 0; i < maxSteps; i++) {
      const current = await prisma.employee.findUnique({
        where: { id: currentId },
        select: { supervisorId: true },
      });
      if (!current?.supervisorId) break;

      const supervisor = await prisma.employee.findUnique({
        where: { id: current.supervisorId },
        select: {
          id: true,
          name: true,
          position: true,
          department: { select: { name: true } },
          deputy: { select: { name: true } },
        },
      });
      if (!supervisor) break;

      chain.push({
        name: supervisor.name,
        position: supervisor.position,
        department: supervisor.department.name,
        deputyName: supervisor.deputy?.name ?? null,
      });
      currentId = supervisor.id;
    }

    return chain;
  }

  // 承認チェーン（本人 or サンプル）
  let approvalChain: ChainNode[] = [];
  let sampleChain: ChainNode[] | null = null;

  if (employee?.supervisorId) {
    approvalChain = await buildChainWithDetails(employee.id, 5);
  }

  // employee=null or チェーンが空の場合 → サンプル従業員で代替表示
  if (!employee || approvalChain.length === 0) {
    const sampleEmployee = await prisma.employee.findFirst({
      where: {
        supervisorId: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        position: true,
        department: { select: { name: true } },
      },
      orderBy: { employeeId: "asc" },
    });

    if (sampleEmployee) {
      sampleChain = await buildChainWithDetails(sampleEmployee.id, 5);
      // サンプル従業員情報を先頭に含める
      if (sampleChain.length > 0) {
        sampleChain = [
          {
            name: sampleEmployee.name,
            position: sampleEmployee.position,
            department: sampleEmployee.department.name,
            deputyName: null,
          },
          ...sampleChain,
        ];
      }
    }
  }

  // テンプレート一覧（fieldCount付き）
  const rawTemplates = await prisma.workflowTemplate.findMany({
    where: { isActive: true },
    orderBy: { type: "asc" },
  });

  const templates = rawTemplates.map((t) => {
    const schema = t.formSchema as { fields?: unknown[] } | null;
    return {
      id: t.id,
      type: t.type,
      name: t.name,
      nameJa: t.nameJa,
      description: t.description,
      descriptionJa: t.descriptionJa,
      approvalSteps: t.approvalSteps,
      fieldCount: Array.isArray(schema?.fields) ? schema.fields.length : 0,
    };
  });

  // 統計情報
  const [employeeCount, supervisorSetCount, deputySetCount] = await Promise.all([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { isActive: true, supervisorId: { not: null } } }),
    prisma.employee.count({ where: { isActive: true, deputyId: { not: null } } }),
  ]);

  const stats = {
    employees: employeeCount,
    supervisorSet: supervisorSetCount,
    deputySet: deputySetCount,
    templates: templates.length,
  };

  return {
    employee: employee
      ? {
          name: employee.name,
          position: employee.position,
          department: employee.department.name,
          section: employee.section?.name ?? null,
        }
      : null,
    approvalChain,
    sampleChain,
    templates,
    stats,
  };
}, {});

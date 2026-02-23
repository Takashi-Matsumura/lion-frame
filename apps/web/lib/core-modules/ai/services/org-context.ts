/**
 * 組織データコンテキストビルダー
 *
 * ユーザーのメッセージを分析し、関連する組織データを取得して
 * システムプロンプトに注入するコンテキストを構築する
 */

import { prisma } from "@/lib/prisma";

const MCP_API_KEY_SETTING = "mcp_organization_api_key";

/**
 * MCPサーバ用APIキーが設定されているかを確認
 * 設定されていればAIチャットで組織データアクセスが有効
 */
export async function isOrgContextEnabled(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: MCP_API_KEY_SETTING },
  });
  return !!setting?.value;
}

/**
 * ユーザーのメッセージを分析して必要な組織データを取得し、
 * コンテキスト文字列として返す
 */
export async function buildOrgContext(
  userMessage: string,
): Promise<string | null> {
  const enabled = await isOrgContextEnabled();
  if (!enabled) return null;

  const intent = detectOrgIntent(userMessage);
  if (intent.type === "none") return null;

  try {
    const data = await fetchOrgData(intent);
    if (!data) return null;
    return formatOrgContext(intent, data);
  } catch (error) {
    console.error("Error building org context:", error);
    return null;
  }
}

// ============================================
// インテント検出
// ============================================

type OrgIntent =
  | { type: "none" }
  | { type: "structure" }
  | { type: "search"; query: string }
  | { type: "employee_detail"; query: string }
  | { type: "department_employees"; department: string }
  | { type: "positions" }
  | { type: "overview" };

/**
 * ユーザーメッセージから組織データ関連のインテントを検出
 */
function detectOrgIntent(message: string): OrgIntent {
  const msg = message.toLowerCase();

  // 組織構造・組織図に関する質問
  if (
    /組織(構造|構成|図|ツリー|体制|一覧)|部署(一覧|構成)|organization\s*(structure|chart|tree)|departments?/i.test(
      message,
    )
  ) {
    return { type: "structure" };
  }

  // 役職マスタに関する質問
  if (
    /役職(マスタ|一覧|リスト)|positions?\s*(master|list)|職位/i.test(message)
  ) {
    return { type: "positions" };
  }

  // 特定の部署の社員一覧
  const deptMatch = message.match(
    /(.+?)(本部|部|課)(の|に)(所属|在籍).*?(社員|メンバー|スタッフ|人|名)|(.+?)(本部|部|課).*?誰/,
  );
  if (deptMatch) {
    const deptName = (deptMatch[1] || deptMatch[6])?.trim();
    if (deptName) {
      return { type: "department_employees", department: deptName };
    }
  }

  // 社員検索（名前で聞いている）
  const personMatch = message.match(
    /(.+?)さん(は|の|って|について)|(.+?)(という|って名前の)(社員|人|方)|(.+?)の(所属|部署|連絡先|メール|役職)/,
  );
  if (personMatch) {
    const name = (
      personMatch[1] ||
      personMatch[3] ||
      personMatch[6]
    )?.trim();
    if (name && name.length >= 2) {
      return { type: "search", query: name };
    }
  }

  // 「社員数」「何人」「合計」など概要に関する質問
  if (
    /社員数|何人|全社員|合計.*?(人|名)|人数|how many\s*(employees|people|staff)|total\s*(employees|headcount)/i.test(
      message,
    )
  ) {
    return { type: "overview" };
  }

  // 一般的な社員検索キーワード
  if (
    /社員.*?(検索|探|調べ|教え)|employee.*?(search|find|look)|誰が|who\s*(is|are)/i.test(
      message,
    )
  ) {
    // 検索キーワードを抽出
    const searchMatch = message.match(
      /[「」『』](.+?)[「」『』]|"(.+?)"|'(.+?)'/,
    );
    if (searchMatch) {
      const query = (
        searchMatch[1] ||
        searchMatch[2] ||
        searchMatch[3]
      )?.trim();
      if (query) {
        return { type: "search", query };
      }
    }
  }

  // 組織関連のキーワードが含まれるがインテントが不明確な場合
  if (
    /社員|従業員|スタッフ|メンバー|employee|staff|member|部長|課長|本部長|manager|director/i.test(
      message,
    )
  ) {
    return { type: "overview" };
  }

  return { type: "none" };
}

// ============================================
// データ取得
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOrgData(intent: OrgIntent): Promise<any> {
  // 公開済み組織を取得
  const organization = await prisma.organization.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  if (!organization) return null;

  switch (intent.type) {
    case "structure":
      return fetchStructure(organization.id);
    case "positions":
      return fetchPositions();
    case "search":
      return fetchEmployeeSearch(organization.id, intent.query);
    case "employee_detail":
      return fetchEmployeeSearch(organization.id, intent.query);
    case "department_employees":
      return fetchDepartmentEmployees(organization.id, intent.department);
    case "overview":
      return fetchOverview(organization.id);
    default:
      return null;
  }
}

async function fetchStructure(organizationId: string) {
  const departments = await prisma.department.findMany({
    where: { organizationId },
    orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    include: {
      _count: { select: { employees: { where: { isActive: true } } } },
      manager: { select: { name: true, position: true } },
      sections: {
        orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
        include: {
          _count: { select: { employees: { where: { isActive: true } } } },
          manager: { select: { name: true, position: true } },
          courses: {
            orderBy: [
              { code: { sort: "asc", nulls: "last" } },
              { name: "asc" },
            ],
            include: {
              _count: {
                select: { employees: { where: { isActive: true } } },
              },
              manager: { select: { name: true, position: true } },
            },
          },
        },
      },
    },
  });

  const totalEmployees = await prisma.employee.count({
    where: { organizationId, isActive: true },
  });

  return { departments, totalEmployees };
}

async function fetchPositions() {
  return prisma.positionMaster.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      code: true,
      name: true,
      nameJa: true,
      level: true,
      isManager: true,
    },
  });
}

async function fetchEmployeeSearch(organizationId: string, query: string) {
  return prisma.employee.findMany({
    where: {
      organizationId,
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { nameKana: { contains: query, mode: "insensitive" } },
        { employeeId: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      department: { select: { name: true } },
      section: { select: { name: true } },
      course: { select: { name: true } },
    },
    take: 20,
    orderBy: { name: "asc" },
  });
}

async function fetchDepartmentEmployees(
  organizationId: string,
  deptName: string,
) {
  // 本部・部・課名で検索
  const department = await prisma.department.findFirst({
    where: {
      organizationId,
      name: { contains: deptName, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });

  const section = !department
    ? await prisma.section.findFirst({
        where: {
          department: { organizationId },
          name: { contains: deptName, mode: "insensitive" },
        },
        select: { id: true, name: true },
      })
    : null;

  const course =
    !department && !section
      ? await prisma.course.findFirst({
          where: {
            section: { department: { organizationId } },
            name: { contains: deptName, mode: "insensitive" },
          },
          select: { id: true, name: true },
        })
      : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId, isActive: true };
  const unitName = department?.name || section?.name || course?.name;

  if (department) where.departmentId = department.id;
  else if (section) where.sectionId = section.id;
  else if (course) where.courseId = course.id;
  else return null;

  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: { select: { name: true } },
      section: { select: { name: true } },
      course: { select: { name: true } },
    },
    take: 50,
    orderBy: { name: "asc" },
  });

  return { unitName, employees };
}

async function fetchOverview(organizationId: string) {
  const totalEmployees = await prisma.employee.count({
    where: { organizationId, isActive: true },
  });

  const departments = await prisma.department.findMany({
    where: { organizationId },
    select: {
      name: true,
      _count: { select: { employees: { where: { isActive: true } } } },
    },
    orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
  });

  return { totalEmployees, departments };
}

// ============================================
// コンテキスト整形
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatOrgContext(intent: OrgIntent, data: any): string {
  let context = "";

  switch (intent.type) {
    case "structure": {
      context = "【組織構造データ】\n";
      context += `全社員数: ${data.totalEmployees}名\n\n`;
      for (const dept of data.departments) {
        const mgr = dept.manager
          ? ` (責任者: ${dept.manager.name} ${dept.manager.position || ""})`
          : "";
        context += `■ ${dept.name}${mgr} - ${dept._count.employees}名\n`;
        for (const sect of dept.sections) {
          const sMgr = sect.manager
            ? ` (責任者: ${sect.manager.name} ${sect.manager.position || ""})`
            : "";
          context += `  ├ ${sect.name}${sMgr} - ${sect._count.employees}名\n`;
          for (const course of sect.courses) {
            const cMgr = course.manager
              ? ` (責任者: ${course.manager.name} ${course.manager.position || ""})`
              : "";
            context += `  │  └ ${course.name}${cMgr} - ${course._count.employees}名\n`;
          }
        }
      }
      break;
    }

    case "positions": {
      context = "【役職マスタデータ】\n";
      for (const pos of data) {
        const mgr = pos.isManager ? " [管理職]" : "";
        context += `- ${pos.nameJa || pos.name} (コード: ${pos.code}, レベル: ${pos.level}${mgr})\n`;
      }
      break;
    }

    case "search":
    case "employee_detail": {
      if (data.length === 0) {
        context = `【検索結果】「${intent.query}」に一致する社員は見つかりませんでした。\n`;
      } else {
        context = `【社員検索結果】「${intent.query}」- ${data.length}名\n\n`;
        for (const emp of data) {
          const affiliation = [
            emp.department?.name,
            emp.section?.name,
            emp.course?.name,
          ]
            .filter(Boolean)
            .join(" > ");
          context += `- ${emp.name}`;
          if (emp.nameKana) context += ` (${emp.nameKana})`;
          context += `\n  社員番号: ${emp.employeeId || "未設定"}`;
          context += `\n  役職: ${emp.position || "未設定"}`;
          context += `\n  所属: ${affiliation || "未設定"}`;
          if (emp.email) context += `\n  メール: ${emp.email}`;
          context += "\n\n";
        }
      }
      break;
    }

    case "department_employees": {
      if (!data || data.employees.length === 0) {
        context = `【検索結果】「${intent.department}」に所属する社員は見つかりませんでした。\n`;
      } else {
        context = `【${data.unitName}の社員一覧】${data.employees.length}名\n\n`;
        for (const emp of data.employees) {
          context += `- ${emp.name}`;
          if (emp.position) context += ` (${emp.position})`;
          if (emp.email) context += ` - ${emp.email}`;
          context += "\n";
        }
      }
      break;
    }

    case "overview": {
      context = "【組織概要データ】\n";
      context += `全社員数（在籍中）: ${data.totalEmployees}名\n\n`;
      context += "本部別人数:\n";
      for (const dept of data.departments) {
        context += `- ${dept.name}: ${dept._count.employees}名\n`;
      }
      break;
    }
  }

  return context;
}

/**
 * 組織データアクセスが有効な場合のシステムプロンプト拡張文
 */
export const ORG_CONTEXT_SYSTEM_ADDITION = `

あなたは組織データにアクセスできます。ユーザーが組織構造、社員情報、役職について質問した場合、
提供されたデータに基づいて正確に回答してください。
データは「【】」で囲まれたセクションとして提供されます。
データに含まれない情報については推測せず、「該当するデータが見つかりませんでした」と回答してください。
個人情報は質問に対して必要な範囲のみ回答し、不必要な詳細は開示しないでください。`;

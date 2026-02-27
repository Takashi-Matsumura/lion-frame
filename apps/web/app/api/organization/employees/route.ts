import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/employees
 *
 * 社員一覧を取得（フィルター・ページネーション対応）
 *
 * クエリパラメータ:
 * - departmentId: 本部ID
 * - sectionId: 部ID
 * - courseId: 課ID
 * - search: 名前・社員番号検索
 * - position: 役職フィルター
 * - isActive: 在籍ステータス（true/false）
 * - exclusiveMode: 重複しない表示モード（true: 各階層に直接所属する社員のみ表示）
 * - page: ページ番号（デフォルト: 1）
 * - limit: 1ページあたりの件数（デフォルト: 50）
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId");
  const sectionId = searchParams.get("sectionId");
  const courseId = searchParams.get("courseId");
  const search = searchParams.get("search");
  const position = searchParams.get("position");
  const isActiveParam = searchParams.get("isActive");
  const exclusiveMode = searchParams.get("exclusiveMode") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // 公開済み組織を取得（PUBLISHED優先、SCHEDULED自動昇格）
  // PUBLISHED/SCHEDULED検索を並列実行（async-parallel）
  const [published, scheduled] = await Promise.all([
    prisma.organization.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.organization.findFirst({
      where: {
        status: "SCHEDULED",
        publishAt: { lte: new Date() },
      },
      orderBy: { publishAt: "asc" },
    }),
  ]);

  let organization = published;
  if (!organization && scheduled) {
    await prisma.organization.updateMany({
      where: { status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });

    organization = await prisma.organization.update({
      where: { id: scheduled.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }

  if (!organization) {
    return {
      employees: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
  }

  // フィルター条件を構築
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    organizationId: organization.id,
  };

  // 在籍ステータスフィルター（デフォルトは在籍中のみ）
  if (isActiveParam === "false") {
    where.isActive = false;
  } else if (isActiveParam === "all") {
    // 全て表示（条件なし）
  } else {
    where.isActive = true;
  }

  // 組織階層フィルター
  // exclusiveMode: 重複しない表示（各階層に直接所属する社員のみ）
  // - 課を選択: その課に所属する社員のみ
  // - 部を選択: その部に所属し、課には所属しない社員のみ
  // - 本部を選択: その本部に所属し、部には所属しない社員のみ
  if (courseId) {
    where.courseId = courseId;
  } else if (sectionId) {
    where.sectionId = sectionId;
    if (exclusiveMode) {
      where.courseId = null; // 課に所属していない社員のみ
    }
  } else if (departmentId) {
    where.departmentId = departmentId;
    if (exclusiveMode) {
      where.sectionId = null; // 部に所属していない社員のみ
    }
  }

  // 検索フィルター（名前・社員番号・メール）
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nameKana: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // 役職フィルター
  if (position) {
    where.position = position;
  }

  // 独立したクエリを並列実行（async-parallel）
  const [total, positionMasters, allEmployees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.positionMaster.findMany({
      where: { isActive: true },
      select: { code: true, displayOrder: true, color: true },
    }),
    prisma.employee.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        section: {
          select: { id: true, name: true, code: true },
        },
        course: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
  ]);

  const positionOrderMap = new Map<string, number>();
  const positionColorMap = new Map<string, string | null>();
  for (const pm of positionMasters) {
    positionOrderMap.set(pm.code, pm.displayOrder);
    positionColorMap.set(pm.code, pm.color);
  }
  const usePositionMaster = positionMasters.length > 0;

  // カスタムソート: PositionMaster.displayOrder → 役職コード順（「000」は最後）→ 名前の五十音順
  const sortedEmployees = allEmployees.sort((a, b) => {
    if (usePositionMaster) {
      // PositionMasterのdisplayOrderで並び替え
      const orderA = a.positionCode != null ? (positionOrderMap.get(a.positionCode) ?? 99999) : 99999;
      const orderB = b.positionCode != null ? (positionOrderMap.get(b.positionCode) ?? 99999) : 99999;
      if (orderA !== orderB) return orderA - orderB;
    } else {
      // フォールバック: 従来の役職コード順
      const codeA = a.positionCode || "999";
      const codeB = b.positionCode || "999";

      const isGeneralA = codeA === "000";
      const isGeneralB = codeB === "000";

      if (isGeneralA && !isGeneralB) return 1;
      if (!isGeneralA && isGeneralB) return -1;

      if (codeA !== codeB) {
        return codeA.localeCompare(codeB);
      }
    }

    // 同じ表示順の場合は名前カナ（五十音順）でソート
    const nameA = a.nameKana || a.name || "";
    const nameB = b.nameKana || b.name || "";
    return nameA.localeCompare(nameB, "ja");
  });

  // ページネーション適用
  const employees = sortedEmployees.slice((page - 1) * limit, page * limit);

  // 役職リストを取得（フィルター用）
  const positionsData = await prisma.employee.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
    select: { position: true, positionCode: true },
    distinct: ["position"],
  });

  // 役職リストをソート（PositionMaster.displayOrder → 役職コード順）
  const sortedPositions = positionsData.sort((a, b) => {
    if (usePositionMaster) {
      const orderA = a.positionCode != null ? (positionOrderMap.get(a.positionCode) ?? 99999) : 99999;
      const orderB = b.positionCode != null ? (positionOrderMap.get(b.positionCode) ?? 99999) : 99999;
      return orderA - orderB;
    }
    const codeA = a.positionCode || "999";
    const codeB = b.positionCode || "999";
    if (codeA === "000" && codeB !== "000") return 1;
    if (codeA !== "000" && codeB === "000") return -1;
    return codeA.localeCompare(codeB);
  });

  return {
    employees: employees.map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.name,
      nameKana: emp.nameKana,
      email: emp.email,
      phone: emp.phone,
      position: emp.position,
      positionCode: emp.positionCode,
      positionColor: emp.positionCode != null ? (positionColorMap.get(emp.positionCode) ?? null) : null,
      department: emp.department,
      section: emp.section,
      course: emp.course,
      isActive: emp.isActive,
      joinDate: emp.joinDate,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    positions: sortedPositions.map((p) => p.position),
  };
});

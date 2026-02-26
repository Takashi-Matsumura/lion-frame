import { prisma } from "@/lib/prisma";

interface EmployeeQueryParams {
  organizationId: string;
  departmentId?: string | null;
  sectionId?: string | null;
  courseId?: string | null;
  search?: string | null;
  position?: string | null;
  isActive?: string | null;
  exclusiveMode?: boolean;
  page?: number;
  limit?: number;
}

interface PositionMasterInfo {
  orderMap: Map<string, number>;
  colorMap: Map<string, string | null>;
  hasData: boolean;
}

/**
 * Employee query service.
 * Extracts complex employee listing logic from the API route.
 */
export class EmployeeService {
  /**
   * Get the published organization, auto-promoting scheduled orgs if needed.
   */
  static async getPublishedOrganization() {
    let organization = await prisma.organization.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    });

    if (!organization) {
      const scheduledOrg = await prisma.organization.findFirst({
        where: {
          status: "SCHEDULED",
          publishAt: { lte: new Date() },
        },
        orderBy: { publishAt: "asc" },
      });

      if (scheduledOrg) {
        await prisma.organization.updateMany({
          where: { status: "PUBLISHED" },
          data: { status: "ARCHIVED" },
        });

        organization = await prisma.organization.update({
          where: { id: scheduledOrg.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });
      }
    }

    return organization;
  }

  /**
   * Load position master data for sorting and display.
   */
  static async getPositionMasters(): Promise<PositionMasterInfo> {
    const positionMasters = await prisma.positionMaster.findMany({
      where: { isActive: true },
      select: { code: true, displayOrder: true, color: true },
    });

    const orderMap = new Map<string, number>();
    const colorMap = new Map<string, string | null>();
    for (const pm of positionMasters) {
      orderMap.set(pm.code, pm.displayOrder);
      colorMap.set(pm.code, pm.color);
    }

    return {
      orderMap,
      colorMap,
      hasData: positionMasters.length > 0,
    };
  }

  /**
   * Build Prisma where clause from query parameters.
   */
  static buildWhereClause(params: EmployeeQueryParams) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      organizationId: params.organizationId,
    };

    // Active status filter
    if (params.isActive === "false") {
      where.isActive = false;
    } else if (params.isActive === "all") {
      // Show all
    } else {
      where.isActive = true;
    }

    // Organization hierarchy filter
    if (params.courseId) {
      where.courseId = params.courseId;
    } else if (params.sectionId) {
      where.sectionId = params.sectionId;
      if (params.exclusiveMode) {
        where.courseId = null;
      }
    } else if (params.departmentId) {
      where.departmentId = params.departmentId;
      if (params.exclusiveMode) {
        where.sectionId = null;
      }
    }

    // Search filter
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { nameKana: { contains: params.search, mode: "insensitive" } },
        { employeeId: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    // Position filter
    if (params.position) {
      where.position = params.position;
    }

    return where;
  }

  /**
   * Sort employees by position master display order, then by name kana.
   */
  static sortByPosition<
    T extends { positionCode: string | null; nameKana: string | null; name: string },
  >(employees: T[], positionInfo: PositionMasterInfo): T[] {
    return [...employees].sort((a, b) => {
      if (positionInfo.hasData) {
        const orderA =
          a.positionCode != null
            ? (positionInfo.orderMap.get(a.positionCode) ?? 99999)
            : 99999;
        const orderB =
          b.positionCode != null
            ? (positionInfo.orderMap.get(b.positionCode) ?? 99999)
            : 99999;
        if (orderA !== orderB) return orderA - orderB;
      } else {
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

      const nameA = a.nameKana || a.name || "";
      const nameB = b.nameKana || b.name || "";
      return nameA.localeCompare(nameB, "ja");
    });
  }

  /**
   * Get distinct positions for an organization, sorted by display order.
   */
  static async getDistinctPositions(
    organizationId: string,
    positionInfo: PositionMasterInfo,
  ): Promise<string[]> {
    const positionsData = await prisma.employee.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: { position: true, positionCode: true },
      distinct: ["position"],
    });

    const sorted = [...positionsData].sort((a, b) => {
      if (positionInfo.hasData) {
        const orderA =
          a.positionCode != null
            ? (positionInfo.orderMap.get(a.positionCode) ?? 99999)
            : 99999;
        const orderB =
          b.positionCode != null
            ? (positionInfo.orderMap.get(b.positionCode) ?? 99999)
            : 99999;
        return orderA - orderB;
      }
      const codeA = a.positionCode || "999";
      const codeB = b.positionCode || "999";
      if (codeA === "000" && codeB !== "000") return 1;
      if (codeA !== "000" && codeB === "000") return -1;
      return codeA.localeCompare(codeB);
    });

    return sorted.map((p) => p.position);
  }
}

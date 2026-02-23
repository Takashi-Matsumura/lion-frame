/**
 * MCP ツール定義（inputSchema）
 */
export const TOOLS = [
  {
    name: "org_get_structure",
    description:
      "Get the organization tree structure (departments → sections → courses) with manager info and employee counts",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "org_list_employees",
    description:
      "List employees with optional filters (department, section, course, position, active status) and pagination",
    inputSchema: {
      type: "object" as const,
      properties: {
        departmentId: {
          type: "string",
          description: "Filter by department ID",
        },
        sectionId: {
          type: "string",
          description: "Filter by section ID",
        },
        courseId: {
          type: "string",
          description: "Filter by course ID",
        },
        search: {
          type: "string",
          description:
            "Search by name, name kana, employee number, or email",
        },
        position: {
          type: "string",
          description: "Filter by position name",
        },
        isActive: {
          type: "boolean",
          description: "Filter by active status (default: true)",
        },
        page: {
          type: "number",
          description: "Page number (default: 1)",
        },
        limit: {
          type: "number",
          description: "Items per page (default: 50, max: 200)",
        },
      },
    },
  },
  {
    name: "org_get_employee",
    description:
      "Get detailed employee information including organization affiliation, position, qualification grade, and employment type",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Employee record ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "org_search_employees",
    description:
      "Search employees by keyword (partial match on name, name kana, employee number, or email)",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search keyword",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 20, max: 100)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "org_list_positions",
    description:
      "List all active position master records with code, name, level, and manager flag",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

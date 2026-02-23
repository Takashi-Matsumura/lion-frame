#!/usr/bin/env node

/**
 * Organization MCP Server
 *
 * 組織データへの読み取り専用アクセスを提供するMCPサーバ
 * stdio通信で動作するスタンドアロンNode.jsプロセス
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateApiKey } from "./auth.js";
import {
  getEmployee,
  getOrganizationTree,
  listEmployees,
  listPositions,
  prisma,
  searchEmployees,
} from "./db-client.js";
import { TOOLS } from "./tools.js";

const server = new Server(
  {
    name: "organization-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ツール一覧
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // APIキー検証
  const authResult = await validateApiKey(prisma);
  if (!authResult.valid) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: false, error: authResult.error },
            null,
            2,
          ),
        },
      ],
    };
  }

  const { name, arguments: args } = request.params;

  try {
    let data: unknown;

    switch (name) {
      case "org_get_structure":
        data = await getOrganizationTree();
        break;

      case "org_list_employees":
        data = await listEmployees({
          departmentId: args?.departmentId as string | undefined,
          sectionId: args?.sectionId as string | undefined,
          courseId: args?.courseId as string | undefined,
          search: args?.search as string | undefined,
          position: args?.position as string | undefined,
          isActive: args?.isActive as boolean | undefined,
          page: args?.page as number | undefined,
          limit: args?.limit as number | undefined,
        });
        break;

      case "org_get_employee": {
        const id = args?.id as string;
        if (!id) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { success: false, error: "Missing required parameter: id" },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        const employee = await getEmployee(id);
        if (!employee) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { success: false, error: "Employee not found" },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        data = employee;
        break;
      }

      case "org_search_employees": {
        const query = args?.query as string;
        if (!query) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: "Missing required parameter: query",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        data = await searchEmployees(query, args?.limit as number | undefined);
        break;
      }

      case "org_list_positions":
        data = await listPositions();
        break;

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: false, error: `Unknown tool: ${name}` },
                null,
                2,
              ),
            },
          ],
        };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: false, error: message }, null, 2),
        },
      ],
    };
  }
});

// サーバ起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Organization MCP server started");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

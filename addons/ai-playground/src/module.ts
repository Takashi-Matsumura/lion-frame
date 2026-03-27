import type { AddonModuleDefinition } from "@lionframe/module-types";

const SETTINGS_ICON =
  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z";

const AI_SPARKLE_ICON =
  "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z";

export const aiPlaygroundModule: AddonModuleDefinition = {
  id: "ai-playground",
  name: "AI Playground",
  nameJa: "AI体験",
  description: "AI learning tool with local LLM, web search, and RAG",
  descriptionJa: "ローカルLLM・Web検索・RAGを使ったAI体験ツール",
  iconPath: AI_SPARKLE_ICON,
  enabled: true,
  order: 10,
  menus: [
    {
      id: "ai-playground",
      moduleId: "ai-playground",
      name: "AI Playground",
      nameJa: "AI体験",
      path: "/ai-playground",
      menuGroup: "guest",
      enabled: true,
      order: 10,
      iconPath: AI_SPARKLE_ICON,
    },
    {
      id: "ai-playground-settings",
      moduleId: "ai-playground",
      name: "AI Playground Settings",
      nameJa: "AI体験設定",
      path: "/manager/ai-playground-settings",
      menuGroup: "manager",
      requiredRoles: ["MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 85,
      iconPath: SETTINGS_ICON,
    },
  ],
  services: [
    {
      id: "ai-playground-api",
      moduleId: "ai-playground",
      name: "AI Playground API",
      nameJa: "AI体験 API",
      apiEndpoints: [
        "/api/ai-playground/chat",
        "/api/ai-playground/search",
        "/api/ai-playground/rag",
      ],
      enabled: true,
    },
  ],
};

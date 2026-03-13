import { auth } from "@/auth";
import { ClientLayout } from "@/components/ClientLayout";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import {
  type AccessKeyPermissions,
  getUserAccessKeyPermissions,
} from "@/lib/access-keys";
import {
  getAccessibleMenus,
  groupMenusByMenuGroup,
} from "@/lib/modules/access-control";
import { getAllModules, menuGroups } from "@/lib/modules/registry";
import { getUserPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { AppMenu, MenuGroup } from "@/types/module";

export const dynamic = "force-dynamic";

/**
 * メインアプリレイアウト
 *
 * 認証・サイドバー・ヘッダー・ThemeProviderを提供。
 * キオスク画面はこのレイアウトを通らないため、独立して動作する。
 */
export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  let userPermissions: string[] = [];
  let language = "en";
  let accessibleMenus: AppMenu[] = [];
  let groupedMenus: Record<string, AppMenu[]> = {};
  let sortedMenuGroups: MenuGroup[] = [];
  let mustChangePassword = false;
  let accessKeyPermissions: AccessKeyPermissions = {
    menuPaths: [],
    tabPermissions: {},
  };

  if (session) {
    const [permissions, user, fetchedAccessKeyPermissions] = await Promise.all([
      getUserPermissions(session.user.id),
      prisma.user.findUnique({
        where: { email: session.user.email || "" },
        select: {
          id: true,
          language: true,
          email: true,
        },
      }),
      getUserAccessKeyPermissions(session.user.id),
    ]);

    userPermissions = permissions;
    language = user?.language || "en";
    accessKeyPermissions = fetchedAccessKeyPermissions;
    mustChangePassword = false;

    // Module Registryから全モジュールを取得
    const allModules = await getAllModules();

    // 全モジュールからメニューを抽出
    const allMenus = allModules.flatMap((module) => {
      if (!module.enabled) {
        return [];
      }

      return module.menus
        .filter((menu) => menu.enabled)
        .map((menu) => {
          const processedChildren = menu.children?.map((child) => ({
            ...child,
            icon: child.icon || module.icon,
          }));

          return {
            ...menu,
            icon: menu.icon || module.icon,
            children: processedChildren,
          };
        });
    });

    // ユーザがアクセス可能なメニューをフィルタリング
    accessibleMenus = getAccessibleMenus(
      allMenus,
      session.user.role,
      userPermissions,
      undefined,
      undefined,
    );

    // Access Keyで許可されたメニューを追加
    const roleBasedMenuPaths = new Set(accessibleMenus.map((m) => m.path));

    const accessKeyMenuList = allMenus.filter((menu) =>
      accessKeyPermissions.menuPaths.includes(menu.path),
    );

    for (const menu of accessKeyMenuList) {
      if (!roleBasedMenuPaths.has(menu.path)) {
        accessibleMenus.push({
          ...menu,
          isAccessKeyGranted: true,
        });
      }
    }

    // 本番環境ではdeveloperグループのメニューを除外
    if (process.env.NODE_ENV !== "development") {
      accessibleMenus = accessibleMenus.filter(
        (menu) => menu.menuGroup !== "developer",
      );
    }

    // メニューグループごとにメニューをグループ化
    groupedMenus = groupMenusByMenuGroup(accessibleMenus);

    // 表示するメニューグループを抽出してソート
    // groupedMenusに含まれるグループはすべて表示（アクセスキー許可分を含む）
    const activeGroupIds = Object.keys(groupedMenus);
    sortedMenuGroups = Object.values(menuGroups)
      .filter((group) => activeGroupIds.includes(group.id))
      .sort((a, b) => a.order - b.order);
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ClientLayout
        session={session}
        userPermissions={userPermissions}
        language={language}
        accessibleMenus={accessibleMenus}
        groupedMenus={groupedMenus}
        menuGroups={sortedMenuGroups}
        mustChangePassword={mustChangePassword}
      >
        <Header
          session={session}
          language={language}
          accessKeyTabPermissions={accessKeyPermissions.tabPermissions}
        />
        <div
          className={`flex-1 overflow-y-auto ${session ? "pt-24" : "pt-20"}`}
        >
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </ClientLayout>
    </ThemeProvider>
  );
}

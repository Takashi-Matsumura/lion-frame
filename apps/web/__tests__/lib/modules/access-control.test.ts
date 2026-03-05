/**
 * アクセス制御ロジックのテスト
 *
 * 仕様: CLAUDE.md「ロール階層」セクション
 * GUEST → USER → MANAGER → EXECUTIVE → ADMIN
 */

import {
  canAccessMenu,
  canAccessMenuGroup,
  canAccessModule,
  canAccessTab,
  checkPermissionForMenu,
  checkPermissionForTab,
  getAccessibleMenus,
  getAccessibleTabs,
  groupMenusByMenuGroup,
} from "@/lib/modules/access-control";
import type { AccessKeyPermissionInfo } from "@/lib/modules/access-control";
import type { AppMenu, AppModule, AppTab } from "@/types/module";

// テスト用のモックメニュー
const createMockMenu = (overrides: Partial<AppMenu> = {}): AppMenu => ({
  id: "test-menu",
  moduleId: "test-module",
  name: "Test Menu",
  nameJa: "テストメニュー",
  path: "/test",
  enabled: true,
  order: 1,
  menuGroup: "user",
  ...overrides,
});

// テスト用のモックモジュール
const createMockModule = (overrides: Partial<AppModule> = {}): AppModule => ({
  id: "test-module",
  name: "Test Module",
  nameJa: "テストモジュール",
  enabled: true,
  order: 1,
  menus: [createMockMenu()],
  ...overrides,
});

describe("access-control", () => {
  describe("canAccessMenuGroup", () => {
    describe("ロール階層に基づくアクセス制御", () => {
      it("GUEST は guest グループのみアクセス可能", () => {
        expect(canAccessMenuGroup("guest", "GUEST")).toBe(true);
        expect(canAccessMenuGroup("user", "GUEST")).toBe(false);
        expect(canAccessMenuGroup("manager", "GUEST")).toBe(false);
        expect(canAccessMenuGroup("executive", "GUEST")).toBe(false);
        expect(canAccessMenuGroup("admin", "GUEST")).toBe(false);
      });

      it("USER は guest, user グループにアクセス可能", () => {
        expect(canAccessMenuGroup("guest", "USER")).toBe(true);
        expect(canAccessMenuGroup("user", "USER")).toBe(true);
        expect(canAccessMenuGroup("manager", "USER")).toBe(false);
        expect(canAccessMenuGroup("executive", "USER")).toBe(false);
        expect(canAccessMenuGroup("admin", "USER")).toBe(false);
      });

      it("MANAGER は guest, user, manager グループにアクセス可能", () => {
        expect(canAccessMenuGroup("guest", "MANAGER")).toBe(true);
        expect(canAccessMenuGroup("user", "MANAGER")).toBe(true);
        expect(canAccessMenuGroup("manager", "MANAGER")).toBe(true);
        expect(canAccessMenuGroup("executive", "MANAGER")).toBe(false);
        expect(canAccessMenuGroup("admin", "MANAGER")).toBe(false);
      });

      it("EXECUTIVE は guest, user, manager, executive グループにアクセス可能", () => {
        expect(canAccessMenuGroup("guest", "EXECUTIVE")).toBe(true);
        expect(canAccessMenuGroup("user", "EXECUTIVE")).toBe(true);
        expect(canAccessMenuGroup("manager", "EXECUTIVE")).toBe(true);
        expect(canAccessMenuGroup("executive", "EXECUTIVE")).toBe(true);
        expect(canAccessMenuGroup("admin", "EXECUTIVE")).toBe(false);
      });

      it("ADMIN は全グループにアクセス可能", () => {
        expect(canAccessMenuGroup("guest", "ADMIN")).toBe(true);
        expect(canAccessMenuGroup("user", "ADMIN")).toBe(true);
        expect(canAccessMenuGroup("manager", "ADMIN")).toBe(true);
        expect(canAccessMenuGroup("executive", "ADMIN")).toBe(true);
        expect(canAccessMenuGroup("admin", "ADMIN")).toBe(true);
      });
    });
  });

  describe("canAccessMenu", () => {
    describe("基本的なアクセス制御", () => {
      it("無効なメニューには誰もアクセスできない", () => {
        const menu = createMockMenu({ enabled: false });
        expect(canAccessMenu(menu, "ADMIN", [])).toBe(false);
      });

      it("requiredRoles が空の場合、全ロールがアクセス可能", () => {
        const menu = createMockMenu({ requiredRoles: [] });
        expect(canAccessMenu(menu, "USER", [])).toBe(true);
        expect(canAccessMenu(menu, "GUEST", [])).toBe(true);
      });

      it("requiredRoles に含まれるロールのみアクセス可能", () => {
        const menu = createMockMenu({ requiredRoles: ["MANAGER", "ADMIN"] });
        expect(canAccessMenu(menu, "USER", [])).toBe(false);
        expect(canAccessMenu(menu, "MANAGER", [])).toBe(true);
        expect(canAccessMenu(menu, "ADMIN", [])).toBe(true);
      });
    });

    describe("権限ベースのアクセス制御", () => {
      it("requiredPermissions が設定されている場合、権限チェックを行う", () => {
        const menu = createMockMenu({
          requiredRoles: ["USER", "ADMIN"],
          requiredPermissions: ["view_reports"],
        });
        expect(canAccessMenu(menu, "USER", [])).toBe(false);
        expect(canAccessMenu(menu, "USER", ["view_reports"])).toBe(true);
      });

      it("複数の権限のうち1つでも持っていればアクセス可能", () => {
        const menu = createMockMenu({
          requiredRoles: ["USER"],
          requiredPermissions: ["perm_a", "perm_b"],
        });
        expect(canAccessMenu(menu, "USER", ["perm_a"])).toBe(true);
        expect(canAccessMenu(menu, "USER", ["perm_b"])).toBe(true);
        expect(canAccessMenu(menu, "USER", ["perm_c"])).toBe(false);
      });
    });

    describe("役職ベースのアクセス制御", () => {
      it("requiredPositions が設定されている場合、役職チェックを行う", () => {
        const menu = createMockMenu({
          requiredRoles: ["USER"],
          requiredPositions: ["部長", "課長"],
        });
        expect(canAccessMenu(menu, "USER", [], undefined)).toBe(false);
        expect(canAccessMenu(menu, "USER", [], "部長")).toBe(true);
        expect(canAccessMenu(menu, "USER", [], "課長")).toBe(true);
        expect(canAccessMenu(menu, "USER", [], "主任")).toBe(false);
      });

      it("ADMIN は役職チェックをスキップ", () => {
        const menu = createMockMenu({
          requiredRoles: ["ADMIN"],
          requiredPositions: ["部長"],
        });
        expect(canAccessMenu(menu, "ADMIN", [], undefined)).toBe(true);
      });
    });

    describe("アクセスキーベースのアクセス制御", () => {
      it("requiredAccessKey が設定されている場合、アクセスキーチェックを行う", () => {
        const menu = createMockMenu({
          requiredRoles: ["USER"],
          requiredAccessKey: "special_access",
        });
        expect(canAccessMenu(menu, "USER", [], undefined, undefined, [])).toBe(
          false,
        );
        expect(
          canAccessMenu(menu, "USER", [], undefined, undefined, [
            "special_access",
          ]),
        ).toBe(true);
      });

      it("ADMIN はアクセスキーチェックをスキップ", () => {
        const menu = createMockMenu({
          requiredRoles: ["ADMIN"],
          requiredAccessKey: "special_access",
        });
        expect(canAccessMenu(menu, "ADMIN", [], undefined, undefined, [])).toBe(
          true,
        );
      });
    });
  });

  describe("canAccessModule", () => {
    it("無効なモジュールにはアクセスできない", () => {
      const module = createMockModule({ enabled: false });
      expect(canAccessModule(module, "ADMIN", [])).toBe(false);
    });

    it("モジュール内のメニューに1つでもアクセスできればtrue", () => {
      const module = createMockModule({
        menus: [
          createMockMenu({ id: "menu1", requiredRoles: ["ADMIN"] }),
          createMockMenu({ id: "menu2", requiredRoles: ["USER"] }),
        ],
      });
      expect(canAccessModule(module, "USER", [])).toBe(true);
    });

    it("モジュール内の全メニューにアクセスできない場合はfalse", () => {
      const module = createMockModule({
        menus: [
          createMockMenu({ id: "menu1", requiredRoles: ["ADMIN"] }),
          createMockMenu({ id: "menu2", requiredRoles: ["ADMIN"] }),
        ],
      });
      expect(canAccessModule(module, "USER", [])).toBe(false);
    });
  });

  describe("getAccessibleMenus", () => {
    it("アクセス可能なメニューのみを返す", () => {
      const menus = [
        createMockMenu({ id: "menu1", requiredRoles: ["USER"], order: 2 }),
        createMockMenu({ id: "menu2", requiredRoles: ["ADMIN"], order: 1 }),
        createMockMenu({ id: "menu3", requiredRoles: ["USER"], order: 3 }),
      ];

      const accessible = getAccessibleMenus(menus, "USER", []);
      expect(accessible).toHaveLength(2);
      expect(accessible.map((m) => m.id)).toEqual(["menu1", "menu3"]);
    });

    it("結果はorder順にソートされる", () => {
      const menus = [
        createMockMenu({ id: "menu1", requiredRoles: ["USER"], order: 3 }),
        createMockMenu({ id: "menu2", requiredRoles: ["USER"], order: 1 }),
        createMockMenu({ id: "menu3", requiredRoles: ["USER"], order: 2 }),
      ];

      const accessible = getAccessibleMenus(menus, "USER", []);
      expect(accessible.map((m) => m.id)).toEqual(["menu2", "menu3", "menu1"]);
    });
  });

  describe("groupMenusByMenuGroup", () => {
    it("メニューをmenuGroup別にグループ化する", () => {
      const menus = [
        createMockMenu({ id: "menu1", menuGroup: "user" }),
        createMockMenu({ id: "menu2", menuGroup: "admin" }),
        createMockMenu({ id: "menu3", menuGroup: "user" }),
      ];

      const grouped = groupMenusByMenuGroup(menus);
      expect(Object.keys(grouped)).toEqual(["user", "admin"]);
      expect(grouped.user).toHaveLength(2);
      expect(grouped.admin).toHaveLength(1);
    });

    it("各グループ内でorder順にソートされる", () => {
      const menus = [
        createMockMenu({ id: "menu1", menuGroup: "user", order: 3 }),
        createMockMenu({ id: "menu2", menuGroup: "user", order: 1 }),
        createMockMenu({ id: "menu3", menuGroup: "user", order: 2 }),
      ];

      const grouped = groupMenusByMenuGroup(menus);
      expect(grouped.user.map((m) => m.id)).toEqual([
        "menu2",
        "menu3",
        "menu1",
      ]);
    });
  });

  // ============================================
  // canAccessMenu エッジケース
  // ============================================
  describe("canAccessMenu - エッジケース", () => {
    it("ADMIN は requiredRoles に含まれなければアクセス不可（ADMINでも自動バイパスしない）", () => {
      const menu = createMockMenu({
        requiredRoles: ["USER", "MANAGER"],
      });
      expect(canAccessMenu(menu, "ADMIN", [])).toBe(false);
    });

    it("requiredRoles + requiredPermissions の両方を満たす必要がある", () => {
      const menu = createMockMenu({
        requiredRoles: ["USER", "MANAGER"],
        requiredPermissions: ["special_perm"],
      });
      // ロールOK、権限NG
      expect(canAccessMenu(menu, "USER", [])).toBe(false);
      // ロールNG、権限OK
      expect(canAccessMenu(menu, "GUEST", ["special_perm"])).toBe(false);
      // ロールOK、権限OK
      expect(canAccessMenu(menu, "USER", ["special_perm"])).toBe(true);
    });

    it("requiredRoles + requiredPositions + requiredPermissions の全てを満たす必要がある", () => {
      const menu = createMockMenu({
        requiredRoles: ["USER", "MANAGER"],
        requiredPermissions: ["view_reports"],
        requiredPositions: ["部長"],
      });
      // 全条件OK
      expect(canAccessMenu(menu, "MANAGER", ["view_reports"], "部長")).toBe(true);
      // 役職NG
      expect(canAccessMenu(menu, "MANAGER", ["view_reports"], "主任")).toBe(false);
      // 権限NG
      expect(canAccessMenu(menu, "MANAGER", [], "部長")).toBe(false);
      // ロールNG
      expect(canAccessMenu(menu, "GUEST", ["view_reports"], "部長")).toBe(false);
    });

    it("ADMIN は requiredRoles に含まれていれば、requiredPositions/requiredAccessKey をスキップ", () => {
      const menu = createMockMenu({
        requiredRoles: ["ADMIN"],
        requiredPositions: ["部長"],
        requiredAccessKey: "secret_key",
      });
      // ADMIN はロールチェック通過後、役職・アクセスキーをスキップ
      expect(canAccessMenu(menu, "ADMIN", [], undefined, undefined, [])).toBe(true);
    });

    it("requiredRoles が未定義の場合、全ロールがアクセス可能", () => {
      const menu = createMockMenu(); // requiredRoles なし
      expect(canAccessMenu(menu, "GUEST", [])).toBe(true);
      expect(canAccessMenu(menu, "ADMIN", [])).toBe(true);
    });

    it("requiredAccessKey が未設定でアクセスキーを持っていなくてもアクセス可能", () => {
      const menu = createMockMenu({
        requiredRoles: ["USER"],
      });
      expect(canAccessMenu(menu, "USER", [], undefined, undefined, [])).toBe(true);
      expect(canAccessMenu(menu, "USER", [], undefined, undefined, undefined)).toBe(true);
    });
  });

  // ============================================
  // タブレベルのアクセス制御
  // ============================================
  describe("checkPermissionForTab", () => {
    it("モジュールレベル権限は配下の全タブにアクセス可能", () => {
      const perm: AccessKeyPermissionInfo = {
        granularity: "module",
        moduleId: "mod-a",
      };
      expect(checkPermissionForTab(perm, "mod-a", "/menu1", "tab1")).toBe(true);
      expect(checkPermissionForTab(perm, "mod-a", "/menu2", "tab2")).toBe(true);
    });

    it("メニューレベル権限は対象メニューの全タブにアクセス可能", () => {
      const perm: AccessKeyPermissionInfo = {
        granularity: "menu",
        moduleId: "mod-a",
        menuPath: "/menu1",
      };
      expect(checkPermissionForTab(perm, "mod-a", "/menu1", "tab1")).toBe(true);
      expect(checkPermissionForTab(perm, "mod-a", "/menu1", "tab2")).toBe(true);
      // 別メニューはNG
      expect(checkPermissionForTab(perm, "mod-a", "/menu2", "tab1")).toBe(false);
    });

    it("タブレベル権限は特定のタブのみアクセス可能", () => {
      const perm: AccessKeyPermissionInfo = {
        granularity: "tab",
        moduleId: "mod-a",
        menuPath: "/menu1",
        tabId: "tab1",
      };
      expect(checkPermissionForTab(perm, "mod-a", "/menu1", "tab1")).toBe(true);
      // 別タブはNG
      expect(checkPermissionForTab(perm, "mod-a", "/menu1", "tab2")).toBe(false);
      // 別メニューはNG
      expect(checkPermissionForTab(perm, "mod-a", "/menu2", "tab1")).toBe(false);
    });

    it("モジュールが異なる場合は常にアクセス不可", () => {
      const perm: AccessKeyPermissionInfo = {
        granularity: "module",
        moduleId: "mod-a",
      };
      expect(checkPermissionForTab(perm, "mod-b", "/menu1", "tab1")).toBe(false);
    });
  });

  describe("checkPermissionForMenu", () => {
    it("モジュールレベル権限は配下の全メニューにアクセス可能", () => {
      const perm: AccessKeyPermissionInfo = {
        granularity: "module",
        moduleId: "mod-a",
      };
      expect(checkPermissionForMenu(perm, "mod-a", "/menu1")).toBe(true);
      expect(checkPermissionForMenu(perm, "mod-a", "/menu2")).toBe(true);
    });

    it("メニューレベル権限は対象メニューのみアクセス可能", () => {
      const perm: AccessKeyPermissionInfo = {
        granularity: "menu",
        moduleId: "mod-a",
        menuPath: "/menu1",
      };
      expect(checkPermissionForMenu(perm, "mod-a", "/menu1")).toBe(true);
      expect(checkPermissionForMenu(perm, "mod-a", "/menu2")).toBe(false);
    });

    it("タブレベル権限でも対象メニューにはアクセス可能", () => {
      const perm: AccessKeyPermissionInfo = {
        granularity: "tab",
        moduleId: "mod-a",
        menuPath: "/menu1",
        tabId: "tab1",
      };
      expect(checkPermissionForMenu(perm, "mod-a", "/menu1")).toBe(true);
      expect(checkPermissionForMenu(perm, "mod-a", "/menu2")).toBe(false);
    });
  });

  describe("canAccessTab", () => {
    const createMockTab = (overrides: Partial<AppTab> = {}): AppTab => ({
      id: "tab1",
      name: "Tab 1",
      nameJa: "タブ1",
      order: 1,
      ...overrides,
    });

    const menuForTab = createMockMenu({
      id: "menu1",
      moduleId: "mod-a",
      path: "/menu1",
      requiredRoles: ["USER", "MANAGER", "ADMIN"],
    });

    it("無効なタブにはアクセスできない", () => {
      const tab = createMockTab({ enabled: false });
      expect(canAccessTab(tab, menuForTab, "mod-a", "ADMIN")).toBe(false);
    });

    it("ADMIN は常にアクセス可能（タブが有効であれば）", () => {
      const tab = createMockTab();
      expect(canAccessTab(tab, menuForTab, "mod-a", "ADMIN")).toBe(true);
    });

    it("メニューの requiredRoles に含まれるロールはタブにアクセス可能", () => {
      const tab = createMockTab();
      expect(canAccessTab(tab, menuForTab, "mod-a", "USER")).toBe(true);
      expect(canAccessTab(tab, menuForTab, "mod-a", "MANAGER")).toBe(true);
    });

    it("メニューの requiredRoles に含まれないロールはアクセスキーが必要", () => {
      const tab = createMockTab();
      // GUEST はメニューの requiredRoles に含まれない
      expect(canAccessTab(tab, menuForTab, "mod-a", "GUEST")).toBe(false);
    });

    it("アクセスキー権限でタブにアクセスできる", () => {
      const tab = createMockTab();
      const permissions: AccessKeyPermissionInfo[] = [
        {
          granularity: "tab",
          moduleId: "mod-a",
          menuPath: "/menu1",
          tabId: "tab1",
        },
      ];
      // GUEST でもアクセスキーがあればOK
      expect(canAccessTab(tab, menuForTab, "mod-a", "GUEST", permissions)).toBe(true);
    });

    it("アクセスキー権限のタブIDが一致しない場合はアクセス不可", () => {
      const tab = createMockTab({ id: "tab2" });
      const permissions: AccessKeyPermissionInfo[] = [
        {
          granularity: "tab",
          moduleId: "mod-a",
          menuPath: "/menu1",
          tabId: "tab1",
        },
      ];
      expect(canAccessTab(tab, menuForTab, "mod-a", "GUEST", permissions)).toBe(false);
    });
  });

  describe("getAccessibleTabs", () => {
    const createMockTab = (overrides: Partial<AppTab> = {}): AppTab => ({
      id: "tab1",
      name: "Tab 1",
      nameJa: "タブ1",
      order: 1,
      ...overrides,
    });

    it("タブがないメニューは空配列を返す", () => {
      const menu = createMockMenu();
      expect(getAccessibleTabs(menu, "mod-a", "ADMIN")).toEqual([]);
    });

    it("アクセス可能なタブのみを返し、order順にソートされる", () => {
      const menu = createMockMenu({
        requiredRoles: ["USER", "ADMIN"],
        tabs: [
          createMockTab({ id: "tab3", order: 3 }),
          createMockTab({ id: "tab1", order: 1 }),
          createMockTab({ id: "tab2", order: 2, enabled: false }),
        ],
      });

      const tabs = getAccessibleTabs(menu, "mod-a", "ADMIN");
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.id)).toEqual(["tab1", "tab3"]);
    });
  });
});

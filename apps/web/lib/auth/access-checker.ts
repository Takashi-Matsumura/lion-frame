import type { Session } from "next-auth";
import { getUserAccessKeyPermissions } from "@/lib/access-keys";

/**
 * ユーザが特定のメニューパスにアクセスする権限があるかチェックする
 *
 * 以下の条件のいずれかを満たす場合、アクセスを許可：
 * 1. ユーザのロールが指定されたrolesに含まれる
 * 2. ユーザが有効なアクセスキーを持ち、そのアクセスキーがmenuPathへのアクセスを許可している
 *
 * 判定基準は `getUserAccessKeyPermissions` に委譲しているため、サイドバー表示と
 * API ゲートでの判定（モジュール粒度の展開、system-delegation キーの TTL チェック等）が
 * 同じロジックを通る。
 *
 * @param session - NextAuthのセッション
 * @param menuPath - アクセスしようとしているメニューのパス（例: "/analytics"）
 * @param roles - 許可するロールの配列（デフォルト: ["MANAGER", "ADMIN"]）
 * @returns アクセス権限がある場合true、ない場合false
 */
export async function checkAccess(
  session: Session | null,
  menuPath: string,
  roles: string[] = ["MANAGER", "ADMIN"],
): Promise<boolean> {
  if (!session?.user) {
    return false;
  }

  // 1. ロールチェック
  const userRole = session.user.role;
  if (roles.includes(userRole || "")) {
    return true;
  }

  // 2. アクセスキーチェック（モジュール粒度の展開もここで行われる）
  try {
    const permissions = await getUserAccessKeyPermissions(session.user.id);
    return permissions.menuPaths.includes(menuPath);
  } catch (error) {
    console.error(
      "[checkAccess] Error checking access key permissions:",
      error,
    );
    return false;
  }
}

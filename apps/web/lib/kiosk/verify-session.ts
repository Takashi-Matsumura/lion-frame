/**
 * キオスクセッションのCookie検証
 *
 * 既存のcookie-signer（HMAC署名）を再利用して、
 * キオスクCookieの署名検証 → DB照合 → セッション有効性チェックを行う。
 */

import { cookies } from "next/headers";
import { verifySignedValue } from "@/lib/services/cookie-signer";
import { getSessionByToken } from "./kiosk-session-service";

const KIOSK_COOKIE_NAME = "kiosk_session";

/**
 * リクエストからキオスクセッションを検証・取得
 * @returns 有効なセッション or null
 */
export async function verifyKioskSession() {
  const cookieStore = await cookies();
  const signedToken = cookieStore.get(KIOSK_COOKIE_NAME)?.value;
  if (!signedToken) return null;

  const token = await verifySignedValue(signedToken);
  if (!token) return null;

  return getSessionByToken(token);
}

export { KIOSK_COOKIE_NAME };

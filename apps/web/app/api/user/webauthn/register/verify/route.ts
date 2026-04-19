import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { ApiError, apiHandler } from "@/lib/api";
import { AuditService } from "@/lib/services/audit-service";
import { NotificationService } from "@/lib/services/notification-service";
import {
  clearChallenge,
  getChallenge,
} from "@/lib/webauthn/challenge-cookie";
import { CredentialService } from "@/lib/webauthn/credential-service";
import { verifyRegistration } from "@/lib/webauthn/verify";

type Body = {
  response: RegistrationResponseJSON;
  nickname?: string;
};

export const POST = apiHandler(async (request, session) => {
  const body = (await request.json().catch(() => null)) as Body | null;

  if (!body?.response) {
    throw ApiError.badRequest("invalid body");
  }

  const ctx = await getChallenge();
  if (!ctx || ctx.kind !== "registration" || ctx.userId !== session.user.id) {
    await clearChallenge();
    throw ApiError.badRequest("no active registration challenge");
  }

  let result;
  try {
    result = await verifyRegistration(body.response, ctx.challenge);
  } catch (error) {
    await clearChallenge();
    throw ApiError.badRequest(
      error instanceof Error ? error.message : "verification failed",
    );
  }

  const nickname = body.nickname?.trim() ? body.nickname.trim() : null;

  const created = await CredentialService.create({
    userId: session.user.id,
    credentialId: result.credentialId,
    publicKey: result.publicKey,
    counter: result.counter,
    transports: result.transports,
    deviceType: result.deviceType,
    backedUp: result.backedUp,
    nickname,
  });

  await clearChallenge();

  await AuditService.log({
    action: "WEBAUTHN_REGISTER",
    category: "USER_MANAGEMENT",
    userId: session.user.id,
    targetId: created.id,
    targetType: "WebAuthnCredential",
    details: {
      deviceType: created.deviceType,
      backedUp: created.backedUp,
      transports: created.transports,
    },
  });

  await NotificationService.securityNotify(session.user.id, {
    title: "Passkey registered",
    titleJa: "パスキーを登録しました",
    message:
      "A new passkey has been added to your account. If you didn't do this, please remove it and contact your administrator.",
    messageJa:
      "アカウントに新しいパスキーが登録されました。心当たりがない場合は削除し、管理者にご連絡ください。",
  }).catch((err) => {
    console.error("[WebAuthn] Failed to create notification:", err);
  });

  return { success: true, credential: created };
});

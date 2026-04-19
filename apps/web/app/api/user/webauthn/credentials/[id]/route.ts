import { ApiError, apiHandler } from "@/lib/api";
import { AuditService } from "@/lib/services/audit-service";
import { CredentialService } from "@/lib/webauthn/credential-service";

const NICKNAME_MAX = 64;

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = apiHandler<{ success: true }, RouteContext>(
  async (request, session, { params }) => {
    const { id } = await params;
    if (!id) throw ApiError.badRequest("missing credential id");

    const body = (await request.json().catch(() => null)) as {
      nickname?: string | null;
    } | null;

    if (!body || !("nickname" in body)) {
      throw ApiError.badRequest("nickname is required");
    }

    let nickname: string | null = null;
    if (typeof body.nickname === "string") {
      const trimmed = body.nickname.trim();
      if (trimmed.length === 0) {
        nickname = null;
      } else if (trimmed.length > NICKNAME_MAX) {
        throw ApiError.badRequest(
          `nickname must be ${NICKNAME_MAX} characters or less`,
        );
      } else {
        nickname = trimmed;
      }
    }

    const updated = await CredentialService.updateNickname(
      id,
      session.user.id,
      nickname,
    );

    if (!updated) {
      throw ApiError.notFound("credential not found");
    }

    await AuditService.log({
      action: "WEBAUTHN_NICKNAME_UPDATE",
      category: "USER_MANAGEMENT",
      userId: session.user.id,
      targetId: id,
      targetType: "WebAuthnCredential",
    });

    return { success: true };
  },
);

export const DELETE = apiHandler<{ success: true }, RouteContext>(
  async (_request, session, { params }) => {
    const { id } = await params;
    if (!id) throw ApiError.badRequest("missing credential id");

    const canRemove = await CredentialService.canUserRemoveCredential(
      session.user.id,
    );
    if (!canRemove) {
      throw ApiError.conflict(
        "Cannot remove the last passkey when no password is set",
        "パスワードが設定されていないため、最後のパスキーは削除できません",
      );
    }

    const deleted = await CredentialService.delete(id, session.user.id);
    if (!deleted) {
      throw ApiError.notFound("credential not found");
    }

    await AuditService.log({
      action: "WEBAUTHN_DELETE",
      category: "USER_MANAGEMENT",
      userId: session.user.id,
      targetId: id,
      targetType: "WebAuthnCredential",
    });

    return { success: true };
  },
);

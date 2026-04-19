export function getRpId(): string {
  const explicit = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID?.trim();
  if (explicit) return explicit;
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) {
    try {
      return new URL(authUrl).hostname;
    } catch {
      // fallthrough
    }
  }
  return "localhost";
}

export function getRpName(): string {
  return process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME?.trim() || "LionFrame";
}

export function getExpectedOrigins(): string[] {
  const explicit = process.env.WEBAUTHN_ORIGIN?.trim();
  if (explicit) {
    return explicit
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) return [authUrl];
  return ["http://localhost:3000"];
}

/**
 * HMAC-based cookie value signing and verification.
 *
 * Uses Web Crypto API for Edge Runtime compatibility (middleware).
 * Uses AUTH_SECRET as the signing key.
 */

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback";
}

async function hmacSign(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sign a value using HMAC-SHA256.
 * Returns "value.signature" format.
 */
export async function signValue(value: string): Promise<string> {
  const signature = await hmacSign(value);
  return `${value}.${signature}`;
}

/**
 * Verify and extract the original value from a signed cookie.
 * Returns the original value if valid, null if tampered.
 */
export async function verifySignedValue(
  signedValue: string,
): Promise<string | null> {
  const lastDot = signedValue.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);

  const expectedSignature = await hmacSign(value);

  // Constant-time comparison to prevent timing attacks
  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(signature, expectedSignature)
  ) {
    return null;
  }

  return value;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

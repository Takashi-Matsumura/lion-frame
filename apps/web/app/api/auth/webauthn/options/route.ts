import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limiter";
import { setChallenge } from "@/lib/webauthn/challenge-cookie";
import { buildAuthenticationOptions } from "@/lib/webauthn/verify";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`webauthn-options:${ip}`, 20, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const options = await buildAuthenticationOptions();

  await setChallenge({
    challenge: options.challenge,
    kind: "authentication",
  });

  return NextResponse.json(options);
}

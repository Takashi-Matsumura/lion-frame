import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { getExpectedOrigins, getRpId, getRpName } from "./config";

type AuthenticatorTransportFuture =
  | "ble"
  | "cable"
  | "hybrid"
  | "internal"
  | "nfc"
  | "smart-card"
  | "usb";

export type RegistrationOptionsInput = {
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentials: Array<{
    credentialId: string;
    transports: string[];
  }>;
};

export async function buildRegistrationOptions(
  input: RegistrationOptionsInput,
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpName: getRpName(),
    rpID: getRpId(),
    userName: input.userName,
    userDisplayName: input.userDisplayName,
    userID: new TextEncoder().encode(input.userId),
    attestationType: "none",
    excludeCredentials: input.excludeCredentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });
}

export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigins(),
    expectedRPID: getRpId(),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("registration verification failed");
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  return {
    credentialId: credential.id,
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: (credential.transports ?? []) as string[],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  };
}

export async function buildAuthenticationOptions(
  allowCredentials: Array<{
    credentialId: string;
    transports: string[];
  }> = [],
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return generateAuthenticationOptions({
    rpID: getRpId(),
    allowCredentials: allowCredentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    userVerification: "required",
  });
}

export type StoredCredential = {
  credentialId: string;
  publicKey: Uint8Array;
  counter: bigint;
  transports: string[];
};

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  stored: StoredCredential,
) {
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getExpectedOrigins(),
    expectedRPID: getRpId(),
    credential: {
      id: stored.credentialId,
      publicKey: new Uint8Array(stored.publicKey),
      counter: Number(stored.counter),
      transports: stored.transports as AuthenticatorTransportFuture[],
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    throw new Error("authentication verification failed");
  }

  return {
    newCounter: verification.authenticationInfo.newCounter,
  };
}

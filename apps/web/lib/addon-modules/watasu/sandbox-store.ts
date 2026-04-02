import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type {
  FileInfo,
  FileStatus,
  SandboxRole,
  Sandbox,
  SandboxInfo,
  SecurityCheckDetail,
} from "./types";

const TMP_DIR = join(tmpdir(), "watasu");
const SANDBOX_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 1000;

// HMR でモジュールが再評価されても Map を保持する（Prisma globalThis パターン）
const STORE_KEY = Symbol.for("watasu-sandboxes");
const g = globalThis as Record<symbol, unknown>;
if (!g[STORE_KEY]) {
  g[STORE_KEY] = new Map<string, Sandbox>();
}
const sandboxes = g[STORE_KEY] as Map<string, Sandbox>;

function generatePin(): string {
  const pin = String(100000 + Math.floor(Math.random() * 900000));
  return sandboxes.has(pin) ? generatePin() : pin;
}

async function ensureTmpDir() {
  await mkdir(TMP_DIR, { recursive: true });
}

export async function createSandbox(userId: string): Promise<{
  sandbox: Sandbox;
  creatorToken: string;
}> {
  await ensureTmpDir();
  const id = generatePin();
  const sandboxDir = join(TMP_DIR, id);
  await mkdir(sandboxDir, { recursive: true });

  const creatorToken = randomUUID();
  const sandbox: Sandbox = {
    id,
    files: [],
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
    createdBy: userId,
    creatorToken,
    joinerTokens: new Set(),
  };
  sandboxes.set(id, sandbox);
  return { sandbox, creatorToken };
}

export function getSandbox(sandboxId: string, touch = true): Sandbox | null {
  const sandbox = sandboxes.get(sandboxId) ?? null;
  if (sandbox && touch) {
    sandbox.lastAccessedAt = Date.now();
  }
  return sandbox;
}

export function getRole(sandbox: Sandbox, token: string): SandboxRole | null {
  if (token === sandbox.creatorToken) return "receiver";
  if (sandbox.joinerTokens.has(token)) return "sender";
  return null;
}

export function addJoinerToken(sandboxId: string): string | null {
  const sandbox = sandboxes.get(sandboxId);
  if (!sandbox) return null;
  const token = randomUUID();
  sandbox.joinerTokens.add(token);
  sandbox.lastAccessedAt = Date.now();
  return token;
}

export function getSandboxInfo(
  sandbox: Sandbox,
  role: SandboxRole,
): SandboxInfo {
  return {
    id: sandbox.id,
    files: sandbox.files.map(({ path: _, ...rest }) => rest),
    createdAt: sandbox.createdAt,
    role,
    expiresAt: sandbox.lastAccessedAt + SANDBOX_TTL_MS,
  };
}

export function getSandboxesByUser(userId: string): SandboxInfo[] {
  const results: SandboxInfo[] = [];
  for (const sandbox of sandboxes.values()) {
    if (sandbox.createdBy === userId) {
      results.push(getSandboxInfo(sandbox, "receiver"));
    }
  }
  return results;
}

export async function addFile(
  sandboxId: string,
  file: File,
): Promise<FileInfo | null> {
  const sandbox = sandboxes.get(sandboxId);
  if (!sandbox) return null;

  const fileId = randomUUID();
  const filePath = join(TMP_DIR, sandboxId, `${fileId}-${file.name}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const info: FileInfo = {
    id: fileId,
    name: file.name,
    size: buffer.length,
    mimeType: file.type || "application/octet-stream",
    uploadedAt: Date.now(),
    path: filePath,
    status: "pending",
  };
  sandbox.files.push(info);
  sandbox.lastAccessedAt = Date.now();
  return info;
}

export function updateFileStatus(
  sandboxId: string,
  fileId: string,
  status: FileStatus,
  rejectionReason?: string,
  securityChecks?: SecurityCheckDetail[],
): void {
  const sandbox = sandboxes.get(sandboxId);
  if (!sandbox) return;
  const file = sandbox.files.find((f) => f.id === fileId);
  if (!file) return;
  file.status = status;
  if (rejectionReason) {
    file.rejectionReason = rejectionReason;
  }
  if (securityChecks) {
    file.securityChecks = securityChecks;
  }
}

export function getFilePath(
  sandboxId: string,
  fileId: string,
): { path: string; name: string; mimeType: string } | null {
  const sandbox = sandboxes.get(sandboxId);
  if (!sandbox) return null;
  const file = sandbox.files.find((f) => f.id === fileId);
  if (!file || file.status !== "approved") return null;
  sandbox.lastAccessedAt = Date.now();
  return { path: file.path, name: file.name, mimeType: file.mimeType };
}

export function deleteSandboxById(sandboxId: string): boolean {
  const sandbox = sandboxes.get(sandboxId);
  if (!sandbox) return false;
  sandboxes.delete(sandboxId);
  const sandboxDir = join(TMP_DIR, sandboxId);
  rm(sandboxDir, { recursive: true, force: true }).catch(() => {});
  return true;
}

async function cleanupExpiredSandboxes() {
  const now = Date.now();
  const expired: string[] = [];
  for (const [id, sandbox] of sandboxes) {
    if (now - sandbox.lastAccessedAt > SANDBOX_TTL_MS) {
      expired.push(id);
    }
  }
  for (const id of expired) {
    deleteSandboxById(id);
  }
}

if (typeof globalThis !== "undefined") {
  const key = Symbol.for("watasu-cleanup");
  const g = globalThis as Record<symbol, unknown>;
  if (!g[key]) {
    g[key] = setInterval(cleanupExpiredSandboxes, CLEANUP_INTERVAL_MS);
  }
}

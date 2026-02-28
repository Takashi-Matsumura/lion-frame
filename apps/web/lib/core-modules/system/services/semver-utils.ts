/**
 * 軽量semverユーティリティ（外部ライブラリ不要）
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

/** "^15.5.12" → "15.5.12", "~4.1.0" → "4.1.0" */
export function cleanVersion(version: string): string {
  return version.replace(/^[\^~>=<]+/, "").trim();
}

/** "1.2.3-beta.1" → { major:1, minor:2, patch:3, prerelease:"beta.1" } */
export function parseVersion(version: string): ParsedVersion | null {
  const cleaned = cleanVersion(version);
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
}

export type DiffType = "major" | "minor" | "patch" | "prerelease" | null;

/** 2つのバージョンの差分種別を返す */
export function diffType(current: string, latest: string): DiffType {
  const a = parseVersion(current);
  const b = parseVersion(latest);
  if (!a || !b) return null;

  if (a.major !== b.major) return "major";
  if (a.minor !== b.minor) return "minor";
  if (a.patch !== b.patch) return "patch";
  if (a.prerelease !== b.prerelease) return "prerelease";
  return null;
}

/** current < latest なら true */
export function isOutdated(current: string, latest: string): boolean {
  const a = parseVersion(current);
  const b = parseVersion(latest);
  if (!a || !b) return false;

  if (a.major !== b.major) return a.major < b.major;
  if (a.minor !== b.minor) return a.minor < b.minor;
  if (a.patch !== b.patch) return a.patch < b.patch;
  // prerelease版はstable版より古いとみなす
  if (a.prerelease && !b.prerelease) return true;
  return false;
}

export type FileStatus = "pending" | "approved" | "rejected";
export type SandboxRole = "receiver" | "sender";

export interface SecurityCheckDetail {
  name: string;
  passed: boolean;
  description: string;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  path: string;
  status: FileStatus;
  rejectionReason?: string;
  securityChecks?: SecurityCheckDetail[];
}

export interface Sandbox {
  id: string;
  files: FileInfo[];
  createdAt: number;
  lastAccessedAt: number;
  createdBy: string; // LionFrame userId
  creatorToken: string;
  joinerTokens: Set<string>;
}

export interface SandboxInfo {
  id: string;
  files: Omit<FileInfo, "path">[];
  createdAt: number;
  role: SandboxRole;
  expiresAt: number;
}

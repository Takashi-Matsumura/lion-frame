import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit-service";

interface AccountEntry {
  employeeId: string;
  email: string;
  name: string;
  role: string;
}

const VALID_ROLES = ["ADMIN", "EXECUTIVE", "MANAGER", "USER", "GUEST"];

/**
 * POST /api/admin/users/create-from-employees
 *
 * 選択された社員のアカウントを一括作成する。
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const accounts: AccountEntry[] = body.accounts;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        {
          error: "No accounts provided",
          errorJa: "アカウント情報が指定されていません",
        },
        { status: 400 },
      );
    }

    // 既存メールアドレスを取得
    const existingUsers = await prisma.user.findMany({
      where: { email: { not: null } },
      select: { email: true },
    });
    const existingEmails = new Set(
      existingUsers.map((u) => u.email?.toLowerCase()).filter(Boolean),
    );

    const created: {
      name: string;
      email: string;
      role: string;
      temporaryPassword: string;
    }[] = [];
    let skipped = 0;
    const errors: { employeeId: string; message: string }[] = [];

    for (const entry of accounts) {
      try {
        // バリデーション
        if (!entry.email || !entry.name) {
          errors.push({
            employeeId: entry.employeeId,
            message: "Name and email are required",
          });
          continue;
        }

        if (!VALID_ROLES.includes(entry.role)) {
          errors.push({
            employeeId: entry.employeeId,
            message: `Invalid role: ${entry.role}`,
          });
          continue;
        }

        // 既存チェック
        if (existingEmails.has(entry.email.toLowerCase())) {
          skipped++;
          continue;
        }

        // 仮パスワード生成
        const temporaryPassword = crypto
          .randomBytes(6)
          .toString("base64url")
          .slice(0, 8);

        // bcrypt でハッシュ化
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // ユーザ作成
        await prisma.user.create({
          data: {
            name: entry.name,
            email: entry.email,
            password: hashedPassword,
            role: entry.role as "ADMIN" | "EXECUTIVE" | "MANAGER" | "USER" | "GUEST",
            forcePasswordChange: true,
          },
        });

        // 作成済みセットに追加（重複防止）
        existingEmails.add(entry.email.toLowerCase());

        created.push({
          name: entry.name,
          email: entry.email,
          role: entry.role,
          temporaryPassword,
        });
      } catch (error) {
        console.error(`Error creating account for ${entry.employeeId}:`, error);
        errors.push({
          employeeId: entry.employeeId,
          message:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 監査ログ記録
    await AuditService.log({
      action: "ACCOUNT_CREATE_FROM_EMPLOYEE",
      category: "USER_MANAGEMENT",
      userId: session.user.id,
      details: {
        createdCount: created.length,
        skippedCount: skipped,
        errorCount: errors.length,
        createdEmails: created.map((c) => c.email),
      },
    }).catch(() => {});

    return NextResponse.json({
      created,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("Error creating accounts from employees:", error);
    return NextResponse.json(
      {
        error: "Failed to create accounts",
        errorJa: "アカウントの作成に失敗しました",
      },
      { status: 500 },
    );
  }
}

import { auth } from "@/auth";
import {
  createSandbox,
  getSandboxesByUser,
} from "@/lib/addon-modules/watasu/sandbox-store";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sandboxes = getSandboxesByUser(session.user.id);
  return Response.json({ sandboxes });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sandbox, creatorToken } = await createSandbox(session.user.id);
  return Response.json({ sandboxId: sandbox.id, creatorToken });
}

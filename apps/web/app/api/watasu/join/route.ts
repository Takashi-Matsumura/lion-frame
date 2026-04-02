import {
  getSandbox,
  addJoinerToken,
} from "@/lib/addon-modules/watasu/sandbox-store";

export async function POST(request: Request) {
  const body = await request.json();
  const { sandboxId } = body;

  if (!sandboxId) {
    return Response.json({ error: "sandboxId required" }, { status: 400 });
  }

  const sandbox = getSandbox(sandboxId);
  if (!sandbox) {
    return Response.json({ error: "Sandbox not found" }, { status: 404 });
  }

  const joinerToken = addJoinerToken(sandboxId);

  return Response.json({ sandboxId, joinerToken, role: "sender" });
}

import { SenderClient } from "./SenderClient";

export default async function WatasuSenderPage({
  params,
}: {
  params: Promise<{ sandboxId: string }>;
}) {
  const { sandboxId } = await params;
  return <SenderClient sandboxId={sandboxId} />;
}

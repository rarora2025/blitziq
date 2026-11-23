import { JoinFlow } from "@/components/JoinFlow";

export default async function InviteLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinFlow initialCode={code} />;
}

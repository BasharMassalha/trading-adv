import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { tradingAgentService } from "@/server/services/trading-agent.service";
import { AgentDesk } from "./agent-desk";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trading agent" };

export default async function AgentPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.isGuest) redirect("/portfolio/upload?trial=true");

  const overview = await tradingAgentService.overview(session.userId);
  return <AgentDesk overview={overview} />;
}

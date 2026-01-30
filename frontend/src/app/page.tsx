import { getClientConfig } from "@/lib/config";
import { HomeClient } from "@/components/home-client";

export default function Home() {
  const config = getClientConfig();
  return <HomeClient config={config} />;
}

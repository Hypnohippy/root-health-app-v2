import { headers } from "next/headers";
import RootLoginClient from "../../components/RootLoginClient.js";
import { isIntroducerDeployment } from "../../lib/introducerRestrictedActions.server.js";

/** The normal customer login remains unchanged, even if this code reaches main. */
export default async function LoginPage() {
  const host = (await headers()).get("host")?.toLowerCase().split(":")[0] || "";
  const isIntroducerCustomer = host === "introducers.roothealth.app" && isIntroducerDeployment(process.env);
  return <RootLoginClient isIntroducerCustomer={isIntroducerCustomer} />;
}

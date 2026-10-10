import packageJson from "../../package.json" with { type: "json" };
import { authorize, type ApiEnv } from "./auth.ts";
import { json } from "./respond.ts";

/** The tools this deployment serves, by their `/api/tools/<name>` segment. */
export const TOOLS = ["internal-link-audit"] as const;

/**
 * Authenticated on purpose: the plugin's status check then tells a wrong
 * token apart from an unreachable host.
 */
export function handleHealth(
  request: Request,
  env: ApiEnv = process.env,
): Response {
  const denied = authorize(request, env);
  if (denied) return denied;
  return json({
    service: "gengrowth-workbench-api",
    version: packageJson.version,
    tools: TOOLS,
  });
}

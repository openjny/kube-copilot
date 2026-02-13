import { defineTool } from "@github/copilot-sdk";
import { execFile } from "node:child_process";

function execKubectlJson(
  args: string[]
): Promise<Record<string, unknown> | string> {
  return new Promise((resolve) => {
    execFile("kubectl", args, { timeout: 10_000 }, (error, stdout, stderr) => {
      if (error) {
        resolve(stderr || error.message);
        return;
      }
      try {
        resolve(JSON.parse(stdout) as Record<string, unknown>);
      } catch {
        resolve(stdout.trim());
      }
    });
  });
}

export const getClusterContext = defineTool("get_cluster_context", {
  description:
    "Retrieve current Kubernetes cluster context information including cluster name, namespace, and context name.",
  parameters: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    const [currentContext, clusterInfo, namespace] = await Promise.all([
      execKubectlJson(["config", "current-context"]),
      execKubectlJson([
        "config",
        "view",
        "--minify",
        "-o",
        "jsonpath={.clusters[0].name}",
      ]),
      execKubectlJson([
        "config",
        "view",
        "--minify",
        "-o",
        "jsonpath={.contexts[0].context.namespace}",
      ]),
    ]);

    return {
      context: typeof currentContext === "string" ? currentContext : "unknown",
      cluster: typeof clusterInfo === "string" ? clusterInfo : "unknown",
      namespace:
        typeof namespace === "string" && namespace ? namespace : "default",
    };
  },
});

import { defineTool } from "@github/copilot-sdk";
import { execFile } from "node:child_process";
import { getRequestConfirmation } from "../context/confirmation.js";

const DESTRUCTIVE_KEYWORDS = [
  "delete",
  "drain",
  "cordon",
  "taint",
  "replace",
];
const TIMEOUT_MS = 30_000;

function isDestructive(command: string): boolean {
  const parts = command.trim().split(/\s+/);
  return parts.some((part) => DESTRUCTIVE_KEYWORDS.includes(part));
}

function execKubectl(
  command: string
): Promise<{ status: string; output: string }> {
  return new Promise((resolve) => {
    const args = command
      .trim()
      .split(/\s+/)
      .filter((a) => a !== "kubectl");
    execFile("kubectl", args, { timeout: TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          status: "error",
          output: stderr || error.message,
        });
      } else {
        resolve({
          status: "success",
          output: stdout,
        });
      }
    });
  });
}

export const runKubectl = defineTool("run_kubectl", {
  description:
    "Execute a kubectl command against the current Kubernetes cluster. The command will be shown to the user for confirmation before execution. Destructive operations require explicit approval.",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description:
          "The kubectl command to execute (e.g. 'kubectl get pods -n default')",
      },
    },
    required: ["command"],
  },
  handler: async (args: unknown) => {
    const { command } = args as { command: string };
    const destructive = isDestructive(command);

    if (destructive) {
      const requestConfirmation = getRequestConfirmation();
      const approved = await requestConfirmation(command, destructive);
      if (!approved) {
        return { status: "cancelled", message: "User declined the command" };
      }
    }

    return await execKubectl(command);
  },
});

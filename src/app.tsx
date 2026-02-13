import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text } from "ink";
import {
  CopilotClient,
  type CopilotSession,
  type SessionEvent,
} from "@github/copilot-sdk";
import { Header } from "./components/Header.js";
import { Timeline, type TimelineEntry } from "./components/Timeline.js";
import { ConfirmationPrompt } from "./components/ConfirmationPrompt.js";
import { InputBar } from "./components/InputBar.js";
import { ConfirmationProvider } from "./context/confirmation.js";
import { Logo } from "./components/Logo.js";
import { runKubectl } from "./tools/kubectl.js";
import { getClusterContext } from "./tools/cluster.js";
import { logger } from "./lib/logger.js";
import { execFile } from "node:child_process";

const SPLASH_DURATION_MS = 2000;

interface ClusterInfo {
  cluster: string;
  namespace: string;
  context: string;
}

function fetchClusterInfo(): Promise<ClusterInfo> {
  return new Promise((resolve) => {
    execFile(
      "kubectl",
      ["config", "current-context"],
      { timeout: 5000 },
      (err1, ctx) => {
        const context = err1 ? "unknown" : ctx.trim();
        execFile(
          "kubectl",
          ["config", "view", "--minify", "-o", "jsonpath={.clusters[0].name}"],
          { timeout: 5000 },
          (err2, cluster) => {
            execFile(
              "kubectl",
              [
                "config",
                "view",
                "--minify",
                "-o",
                "jsonpath={.contexts[0].context.namespace}",
              ],
              { timeout: 5000 },
              (err3, ns) => {
                resolve({
                  context,
                  cluster: err2 ? "unknown" : cluster.trim() || "unknown",
                  namespace: err3 || !ns.trim() ? "default" : ns.trim(),
                });
              },
            );
          },
        );
      },
    );
  });
}

function AppInner() {
  const [showSplash, setShowSplash] = useState(true);
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo>({
    cluster: "connecting...",
    namespace: "default",
    context: "...",
  });
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<CopilotSession | null>(null);
  const [client] = useState(() => new CopilotClient());
  const sessionRef = useRef<CopilotSession | null>(null);

  // Keep ref in sync for cleanup
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Create a Copilot session (used for init and reconnect)
  const createSession =
    useCallback(async (): Promise<CopilotSession | null> => {
      logger.info("Creating Copilot session...");
      try {
        const sess = await client.createSession({
          model: "gpt-4o-mini",
          streaming: true,
          systemMessage: {
            content: [
              "You are **kube-copilot**, a Kubernetes operations agent running inside a terminal TUI.",
              "Your sole purpose is to help users manage and inspect their Kubernetes clusters using kubectl.",
              "",
              "## Personality",
              "- Be concise and action-oriented. You are a DevOps/SRE co-pilot, not a general chatbot.",
              "- When greeted, briefly introduce yourself as a kubectl assistant and suggest what you can do (e.g. list pods, describe resources, check logs, troubleshoot issues).",
              "- Always respond in the context of Kubernetes operations.",
              "",
              "## Behavior",
              "- Convert natural language into kubectl commands and execute them via the run_kubectl tool.",
              "- Before running any command, show the exact kubectl command you plan to execute.",
              "- For **destructive operations** (delete, drain, cordon, scale down, etc.), explicitly warn and require user confirmation.",
              "- For read-only operations (get, describe, logs, top), proceed after showing the command.",
              "- Use get_cluster_context tool to understand the current cluster/namespace when needed.",
              "",
              "## Documentation Lookup (Microsoft Learn MCP)",
              "You have access to Microsoft Learn documentation via the microsoft-learn MCP server. **Actively use it** in these situations:",
              "- When the user asks about Kubernetes concepts, best practices, or AKS-specific features — always search docs first.",
              "- When troubleshooting errors or unexpected behavior — search for the error message or symptom in docs.",
              "- When the user asks \"how to\" or \"what is\" questions related to Kubernetes or Azure — search docs before answering from memory.",
              "- When suggesting configuration changes (resource limits, network policies, RBAC, etc.) — back up recommendations with official docs.",
              "- After running a kubectl command that returns an error — proactively search docs for the error.",
              "- Include a brief citation (doc title + URL) when referencing information from docs.",
              "- Prefer Microsoft Learn / AKS documentation over general knowledge when both are available.",
              "",
              "## Formatting",
              "- Keep responses short — prefer bullet points over paragraphs.",
              "- When showing kubectl output, summarize key findings if the output is long.",
              "- Suggest follow-up actions when relevant (e.g. after listing pods, offer to describe or check logs).",
            ].join("\n"),
          },
          mcpServers: {
            "k8s-docs": {
              type: "local",
              command: "node",
              args: ["./dist/mcp-servers/k8s-docs/index.js"],
              tools: ["*"],
            },
            "microsoft-learn": {
              type: "http",
              url: "https://learn.microsoft.com/api/mcp",
              tools: ["*"],
            },
          },
          tools: [runKubectl, getClusterContext],
        });
        logger.info("Copilot session created successfully");
        return sess;
      } catch (error) {
        logger.error("Failed to create Copilot session:", error);
        return null;
      }
    }, [client]);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Initialize cluster info + Copilot session
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const info = await fetchClusterInfo();
        logger.info("Cluster info:", info);
        if (mounted) setClusterInfo(info);
      } catch {
        logger.warn("Failed to fetch cluster info");
      }

      const sess = await createSession();
      if (mounted && sess) {
        setSession(sess);
      } else if (mounted) {
        setTimeline((prev) => [
          ...prev,
          {
            type: "chat",
            role: "assistant",
            content:
              "Failed to initialize Copilot session. Make sure GitHub Copilot CLI is installed and authenticated.",
          },
        ]);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [client, createSession]);

  // Cleanup on unmount / SIGINT (registered once)
  useEffect(() => {
    const onSigint = () => {
      logger.info("SIGINT received, cleaning up...");
      const doCleanup = async () => {
        try {
          if (sessionRef.current) await sessionRef.current.destroy();
        } catch {
          // already disposed
        }
        try {
          await client.stop();
        } catch {
          // ignore
        }
      };
      doCleanup().finally(() => process.exit(0));
    };

    process.on("SIGINT", onSigint);

    return () => {
      process.removeListener("SIGINT", onSigint);
      const doCleanup = async () => {
        try {
          if (sessionRef.current) await sessionRef.current.destroy();
        } catch {
          // already disposed
        }
        try {
          await client.stop();
        } catch {
          // ignore
        }
      };
      doCleanup().catch(() => {});
    };
  }, [client]); // only depends on client (stable), not session

  const handleSubmit = useCallback(
    async (input: string) => {
      if (!session || isLoading) return;

      logger.info("User input:", input);
      setTimeline((prev) => [...prev, { type: "chat", role: "user", content: input }]);
      setIsLoading(true);

      // Subscribe to session events for this message
      const unsubscribe = session.on((event: SessionEvent) => {
        logger.debug("Session event:", event.type, event.data);
        switch (event.type) {
          case "assistant.message":
            setTimeline((prev) => [
              ...prev,
              {
                type: "chat",
                role: "assistant",
                content: (event.data as { content?: string }).content || "",
              },
            ]);
            break;
          case "tool.execution_start":
            setTimeline((prev) => [
              ...prev,
              {
                type: "tool",
                toolName: (event.data as { toolName?: string }).toolName || "",
                status: "running" as const,
              },
            ]);
            break;
          case "tool.execution_complete": {
            const result = (event.data as { result?: unknown }).result;
            const output =
              typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2);
            setTimeline((prev) => {
              // Find last tool entry that is still running and complete it
              let lastToolIdx = -1;
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].type === "tool" && (prev[i] as TimelineEntry & { type: "tool" }).status === "running") {
                  lastToolIdx = i;
                  break;
                }
              }
              if (lastToolIdx === -1) return prev;
              const updated = [...prev];
              updated[lastToolIdx] = {
                ...updated[lastToolIdx],
                output,
                status: "complete" as const,
              } as TimelineEntry;
              return updated;
            });
            break;
          }
        }
      });

      try {
        await session.sendAndWait({ prompt: input }, 120_000);
        logger.info("sendAndWait completed");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("sendAndWait failed:", msg);

        // Auto-reconnect on disposed connection
        if (
          msg.toLowerCase().includes("disposed") ||
          msg.toLowerCase().includes("connection")
        ) {
          logger.info("Attempting session reconnect...");
          setTimeline((prev) => [
            ...prev,
            {
              type: "chat",
              role: "assistant",
              content: "⚠️ Connection lost. Reconnecting...",
            },
          ]);
          const newSess = await createSession();
          if (newSess) {
            setSession(newSess);
            setTimeline((prev) => [
              ...prev,
              {
                type: "chat",
                role: "assistant",
                content: "✅ Reconnected. Please try again.",
              },
            ]);
          } else {
            setTimeline((prev) => [
              ...prev,
              {
                type: "chat",
                role: "assistant",
                content: "❌ Reconnection failed. Restart the app.",
              },
            ]);
          }
        } else {
          setTimeline((prev) => [
            ...prev,
            { type: "chat", role: "assistant", content: `Error: ${msg}` },
          ]);
        }
      } finally {
        unsubscribe();
        setIsLoading(false);
      }
    },
    [session, isLoading, createSession],
  );

  if (showSplash) {
    return (
      <Box flexDirection="column" width="100%" justifyContent="center">
        <Logo />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      <Header
        cluster={clusterInfo.cluster}
        namespace={clusterInfo.namespace}
        context={clusterInfo.context}
      />
      <Timeline entries={timeline} />
      <ConfirmationPrompt />
      {isLoading && (
        <Box paddingX={1}>
          <Text color="gray">⏳ Thinking...</Text>
        </Box>
      )}
      <InputBar onSubmit={handleSubmit} isDisabled={isLoading} />
    </Box>
  );
}

export function App() {
  return (
    <ConfirmationProvider>
      <AppInner />
    </ConfirmationProvider>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text } from "ink";
import { CopilotClient, type CopilotSession, type SessionEvent } from "@github/copilot-sdk";
import { Header } from "./components/Header.js";
import { ChatArea, type ChatMessage } from "./components/ChatArea.js";
import { CommandDisplay } from "./components/CommandDisplay.js";
import { ConfirmationPrompt } from "./components/ConfirmationPrompt.js";
import { ResultDisplay } from "./components/ResultDisplay.js";
import { InputBar } from "./components/InputBar.js";
import { ConfirmationProvider } from "./context/confirmation.js";
import { runKubectl } from "./tools/kubectl.js";
import { getClusterContext } from "./tools/cluster.js";
import { execFile } from "node:child_process";

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
                  namespace:
                    err3 || !ns.trim() ? "default" : ns.trim(),
                });
              }
            );
          }
        );
      }
    );
  });
}

function AppInner() {
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo>({
    cluster: "connecting...",
    namespace: "default",
    context: "...",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentCommand, setCurrentCommand] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<CopilotSession | null>(null);
  const [client] = useState(() => new CopilotClient());

  // Initialize Copilot session
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Fetch cluster info directly
        const info = await fetchClusterInfo();
        if (mounted) setClusterInfo(info);
      } catch {
        // kubectl might not be configured
      }

      try {
        const sess = await client.createSession({
          streaming: true,
          systemMessage: {
            content: `You are a Kubernetes expert assistant.
- Convert user natural language into kubectl commands
- Always warn before destructive operations (delete, drain, cordon)
- When information is insufficient, search docs via MCP and cite sources
- Display kubectl commands before execution and require user confirmation`,
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

        if (mounted) {
          setSession(sess);
        }
      } catch (error) {
        if (mounted) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Failed to initialize Copilot session: ${error instanceof Error ? error.message : String(error)}. Make sure GitHub Copilot CLI is installed and authenticated.`,
            },
          ]);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [client]);

  // Cleanup on unmount
  useEffect(() => {
    const cleanup = async () => {
      if (session) {
        await session.destroy();
      }
      await client.stop();
    };

    process.on("SIGINT", () => {
      cleanup().finally(() => process.exit(0));
    });

    return () => {
      cleanup().catch(() => {});
    };
  }, [session, client]);

  const handleSubmit = useCallback(
    async (input: string) => {
      if (!session || isLoading) return;

      setMessages((prev) => [...prev, { role: "user", content: input }]);
      setIsLoading(true);
      setCurrentCommand(null);
      setLastOutput(null);

      // Subscribe to session events for this message
      const unsubscribe = session.on((event: SessionEvent) => {
        switch (event.type) {
          case "assistant.message":
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  (event.data as { content?: string }).content ||
                  "",
              },
            ]);
            break;
          case "tool.execution_start":
            setCurrentCommand(
              (event.data as { toolName?: string }).toolName || ""
            );
            break;
          case "tool.execution_complete": {
            const result = (event.data as { result?: unknown }).result;
            const output =
              typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2);
            setLastOutput(output);
            break;
          }
        }
      });

      try {
        await session.sendAndWait({ prompt: input }, 120_000);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ]);
      } finally {
        unsubscribe();
        setIsLoading(false);
      }
    },
    [session, isLoading]
  );

  return (
    <Box flexDirection="column" width="100%">
      <Header
        cluster={clusterInfo.cluster}
        namespace={clusterInfo.namespace}
        context={clusterInfo.context}
      />
      <ChatArea messages={messages} />
      <CommandDisplay command={currentCommand} />
      <ConfirmationPrompt />
      <ResultDisplay output={lastOutput} />
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

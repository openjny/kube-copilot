# kube-copilot — Natural Language Kubernetes TUI

## Overview

A terminal UI (TUI) tool for managing Kubernetes clusters using natural language.  
Wraps kubectl directly and uses **GitHub Copilot SDK** (`@github/copilot-sdk`) to convert natural language into commands.  
LLM selection, authentication, and tool calling are all handled by Copilot CLI — no LLM management required on the app side.  
Integrates with MCP servers via Copilot SDK's `createSession({ mcpServers })` to search K8s Docs / MS Docs and provide evidence-based responses.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                kube-copilot TUI (Ink)                    │
│                                                          │
│  ┌────────────┐    ┌──────────────────────────────────┐  │
│  │  Natural    │───→│  CopilotSession                  │  │
│  │  Language   │    │  (from @github/copilot-sdk)      │  │
│  │  Input      │    │                                  │  │
│  └────────────┘    │  tools: [run_kubectl, ...]        │  │
│                     │  mcpServers:                      │  │
│                     │    k8s-docs  (local/stdio)        │  │
│                     │    ms-learn  (http/streamable)    │  │
│                     └──────────┬───────────────────────┘  │
│                                │ JSON-RPC                 │
└────────────────────────────────┼──────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Copilot CLI         │
                    │  (server mode, auto)    │
                    │  LLM routing & auth     │
                    └──┬─────────┬─────────┬──┘
                       │         │         │
                       ▼         ▼         ▼
                 K8s Cluster  K8s Docs   MS Learn
                 (kubectl)   MCP Server  MCP Server
                             (stdio)    (https://learn.microsoft.com/api/mcp)
```

## Prerequisites

- **Node.js** >= 18 (Copilot SDK requirement)
- **GitHub Copilot CLI** installed and in `$PATH` ([Installation guide](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli))
- **GitHub Copilot subscription** (Free tier is sufficient)
- **kubectl** installed and configured (`~/.kube/config`)
- Access to a Kubernetes cluster (local or remote)

## Target Environment

- Local terminal only (macOS / Linux / Windows with PowerShell or WSL)
- Installed globally via `npm install -g` or run with `npx`
- Requires `kubectl` to be available on `$PATH`

## Tech Stack

| Component       | Technology                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------ |
| Language        | TypeScript                                                                                 |
| Runtime         | Node.js                                                                                    |
| TUI Framework   | [Ink](https://github.com/vadimdemedes/ink) (React for CLI)                                 |
| Agent Runtime   | `@github/copilot-sdk` — communicates with Copilot CLI via JSON-RPC; LLM managed by Copilot |
| MCP (K8s Docs)  | Custom MCP server built with `@modelcontextprotocol/sdk` (stdio)                           |
| MCP (MS Docs)   | Microsoft Learn MCP Server (streamable HTTP, remote)                                       |
| K8s Operations  | kubectl (subprocess invocation)                                                            |
| Validation      | [zod](https://github.com/colinhacks/zod) (schema definition for defineTool)                |
| Package Manager | npm                                                                                        |

## MCP Integration

By passing `mcpServers` to the Copilot SDK's `createSession`, Copilot CLI automatically manages MCP server connections and tool invocations. No need to implement an MCP client on the app side.

```typescript
const session = await client.createSession({
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
  tools: [runKubectl, getClusterContext], // custom tools via defineTool
});
```

### 1. K8s Docs MCP Server (custom, stdio)

A custom MCP server built with `@modelcontextprotocol/sdk`. Copilot CLI launches and communicates with it via stdio.

**Tools:**

| Tool Name            | Description                                         |
| -------------------- | --------------------------------------------------- |
| `search_k8s_docs`    | Search kubernetes.io docs by keyword                |
| `fetch_k8s_doc_page` | Fetch a K8s doc page by URL and convert to Markdown |

**Implementation approach:**

- `fetch_k8s_doc_page`: Directly fetches the kubernetes.io URL and converts HTML → Markdown (using [turndown](https://github.com/mixmark-io/turndown) or similar)
- `search_k8s_docs`: Implements keyword search with the following priority:
  1. Google Custom Search API (when `K8S_DOCS_SEARCH_API_KEY` is set) — highest accuracy
  2. Fallback (no API key): Fetches the kubernetes.io sitemap (`/sitemap.xml`) and performs local keyword matching against URL paths and titles. Limited accuracy but requires no external API

### 2. Microsoft Learn MCP Server (existing remote server, streamable HTTP)

An officially provided remote MCP server by Microsoft. No custom implementation needed — just specify the URL.

- **Endpoint**: `https://learn.microsoft.com/api/mcp`
- **Transport**: Streamable HTTP
- **GitHub**: https://github.com/MicrosoftDocs/mcp

**Provided Tools:**

| Tool Name                      | Description                   |
| ------------------------------ | ----------------------------- |
| `microsoft_docs_search`        | Search MS Learn documentation |
| `microsoft_code_sample_search` | Search code samples           |
| `microsoft_docs_fetch`         | Fetch full documentation page |

## kubectl Wrapper

Defined as custom tools via Copilot SDK's `defineTool`, invoked by Copilot CLI as needed.

**Safety mechanisms:**

- Display the command to the user and require confirmation before execution
- Destructive operations (`delete`, `drain`, `cordon`, etc.) require explicit double confirmation
- Automatically suggest `--dry-run` option
- Timeout setting (default: 30 seconds)

**Confirmation flow architecture:**

The `defineTool` handler is invoked asynchronously by Copilot CLI. To enable user confirmation within the handler, the following pattern is used:

1. The handler creates a `Promise` and sets a "pending confirmation" state along with `resolve/reject` functions in Ink's shared state (via React context)
2. The `ConfirmationPrompt` component detects the state change, displays the command, and waits for user input (Y/N)
3. If the user approves, `resolve()` is called → the handler continues execution; if declined, `reject()` is called → the handler returns a cancellation result

```typescript
// tools/kubectl.ts
const runKubectl = defineTool("run_kubectl", {
  description: "Execute a kubectl command with user confirmation",
  parameters: z.object({ command: z.string() }),
  handler: async ({ command }, invocation) => {
    const approved = await requestConfirmation(command); // Promise that resolves on user input
    if (!approved) return { status: "cancelled", message: "User declined" };
    return await execKubectl(command);
  },
});
```

**Supported command categories:**

- `get` — List / detail resources
- `describe` — Detailed resource information
- `logs` — Pod logs
- `top` — Resource usage
- `apply` / `delete` — Create / delete resources (with confirmation)
- `scale` — Scale changes (with confirmation)
- `exec` — Execute commands inside containers (non-interactive only, e.g. `kubectl exec pod -- ls`; interactive sessions like `bash` are not supported as they conflict with TUI stdin)
- `rollout` — Rollout management

> **Note:** `port-forward` is excluded from MVP scope as it is a long-running process. It conflicts with TUI stdin and the default timeout (30s), and requires background process management design.

## TUI Design

Interactive TUI built with Ink (React for CLI).

```
┌─ kube-copilot ──────────────────────────────────────────┐
│ 🔗 cluster: my-cluster  │  ns: default  │  ctx: docker  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  💬 You: nginx is stuck in CrashLoopBackOff             │
│                                                         │
│  🤖 Copilot:                                            │
│  Let me investigate. First, checking pod status & events │
│                                                         │
│  📎 Run: kubectl get pods -l app=nginx                   │
│  ┌─────────────────────────────────────────────┐        │
│  │ NAME          READY   STATUS             AGE │        │
│  │ nginx-abc123  0/1     CrashLoopBackOff   5m  │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  📎 Run: kubectl describe pod nginx-abc123               │
│  ┌─────────────────────────────────────────────┐        │
│  │ Events:                                      │        │
│  │   Warning  BackOff  ...                      │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  📚 K8s Docs: CrashLoopBackOff means the pod is...     │
│  📚 MS Docs: AKS troubleshooting guide...               │
│                                                         │
│  → Root cause: OOMKilled. Consider increasing memory    │
│    limits or investigating memory leaks in the app.     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ > _                                                     │
└─────────────────────────────────────────────────────────┘
```

**Key components:**

- **Header** — Connected cluster, namespace, and context display
- **Chat Area** — User input and AI response history
- **Command Display** — Shows the kubectl command being executed
- **Result Display** — Command output (table or text)
- **Docs Reference** — Summary of information retrieved via MCP
- **Input Bar** — Natural language input

## Copilot SDK Integration

### Session Configuration

```typescript
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const client = new CopilotClient();
// autoStart: true (default) — Copilot CLI is automatically launched on createSession
const session = await client.createSession({
  streaming: true, // Enable streaming responses
  systemMessage: {
    // Omitting mode defaults to "append" (SDK default) — appended after SDK base messages
    content: `You are a Kubernetes expert assistant.
- Convert user natural language into kubectl commands
- Always warn before destructive operations (delete, drain, cordon)
- When information is insufficient, search docs via MCP and cite sources
- Display kubectl commands before execution and require user confirmation`,
  },
  mcpServers: {
    /* see MCP Integration section */
  },
  tools: [runKubectl, getClusterContext],
});

// Cleanup on app exit
process.on("SIGINT", async () => {
  await session.destroy();
  await client.stop(); // Terminate the Copilot CLI process
  process.exit(0);
});
```

### Custom Tools (defineTool)

MCP server tools are automatically recognized by Copilot CLI, so only app-specific tools are defined via `defineTool`:

- `run_kubectl(command: string)` — Execute a kubectl command (with confirmation UI)
- `get_cluster_context()` — Retrieve current cluster/namespace/context information

## Directory Structure

```
kube-copilot/
├── src/
│   ├── index.tsx            # Entry point
│   ├── app.tsx              # Main App component (CopilotClient lifecycle)
│   ├── components/          # TUI components (Ink)
│   │   ├── Header.tsx
│   │   ├── ChatArea.tsx
│   │   ├── CommandDisplay.tsx
│   │   ├── ConfirmationPrompt.tsx  # kubectl execution confirmation UI
│   │   ├── ResultDisplay.tsx
│   │   └── InputBar.tsx
│   ├── tools/
│   │   ├── kubectl.ts       # run_kubectl tool (defineTool + confirmation bridge)
│   │   └── cluster.ts       # get_cluster_context tool (defineTool)
│   ├── context/
│   │   └── confirmation.ts  # React context for tool <-> UI confirmation bridge
│   └── mcp-servers/
│       └── k8s-docs/        # K8s Docs MCP server (stdio, separate process)
│           ├── index.ts     # McpServer entrypoint
│           └── tools.ts     # search_k8s_docs, fetch_k8s_doc_page
├── tsconfig.json             # Main app config (excludes mcp-servers/)
├── tsconfig.mcp.json         # MCP server config (separate compilation target)
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

> **Build separation**: The K8s Docs MCP server is launched by Copilot CLI as a **separate process**, so it requires a different TypeScript compilation target from the main app. `tsconfig.mcp.json` compiles only `src/mcp-servers/` and outputs to `dist/mcp-servers/`. The `package.json` `build` script builds both sequentially:
>
> ```json
> { "build": "tsc -p tsconfig.json && tsc -p tsconfig.mcp.json" }
> ```

## Environment Variables

```
# Authentication is handled by Copilot CLI (GitHub login)
# No LLM API keys needed.

# K8s Docs MCP (optional)
K8S_DOCS_SEARCH_API_KEY=  # (optional) Google Custom Search API key for k8s docs search
```

## MVP Scope (2-hour Hackathon)

### Must Have

- [ ] Natural language input → kubectl command conversion & execution
- [ ] Pre-execution command confirmation UI
- [ ] K8s Docs MCP server (search + page fetch)
- [ ] MS Docs MCP documentation search
- [ ] Basic TUI (input, output, scrolling)

### Nice to Have

- [ ] Formatted table output for kubectl results
- [ ] Double confirmation for destructive operations
- [ ] Command history
- [ ] Namespace switching UI
- [ ] `port-forward` support (requires background process management)

### Out of Scope

- [ ] Multi-cluster support
- [ ] RBAC / authentication management
- [ ] Custom Resource Definition (CRD) auto-discovery
- [ ] Helm chart operations

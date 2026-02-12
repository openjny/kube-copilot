# kube-copilot — Natural Language Kubernetes TUI

A terminal UI (TUI) tool for managing Kubernetes clusters using natural language.
Wraps kubectl directly and uses **GitHub Copilot SDK** (`@github/copilot-sdk`) to convert natural language into commands.
Integrates with MCP servers via Copilot SDK to search K8s Docs and MS Docs for evidence-based responses.

## Prerequisites

- **Node.js** >= 18
- **GitHub Copilot CLI** installed and in `$PATH` ([Installation guide](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli))
- **GitHub Copilot subscription** (Free tier is sufficient)
- **kubectl** installed and configured (`~/.kube/config`)
- Access to a Kubernetes cluster (local or remote)

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the TUI
npm start
```

Or run directly with `npx`:

```bash
npx kube-copilot
```

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

## MCP Integration

### K8s Docs MCP Server (custom, stdio)

A custom MCP server built with `@modelcontextprotocol/sdk` providing:

| Tool Name            | Description                                         |
| -------------------- | --------------------------------------------------- |
| `search_k8s_docs`    | Search kubernetes.io docs by keyword                |
| `fetch_k8s_doc_page` | Fetch a K8s doc page by URL and convert to Markdown |

### Microsoft Learn MCP Server (remote, streamable HTTP)

Connects to the official Microsoft Learn MCP Server at `https://learn.microsoft.com/api/mcp`.

| Tool Name                      | Description                   |
| ------------------------------ | ----------------------------- |
| `microsoft_docs_search`        | Search MS Learn documentation |
| `microsoft_code_sample_search` | Search code samples           |
| `microsoft_docs_fetch`         | Fetch full documentation page |

## Custom Tools

| Tool Name            | Description                                        |
| -------------------- | -------------------------------------------------- |
| `run_kubectl`        | Execute a kubectl command with user confirmation   |
| `get_cluster_context`| Retrieve current cluster/namespace/context info    |

## Safety Features

- Commands are displayed and require user confirmation before execution
- Destructive operations (`delete`, `drain`, `cordon`, etc.) require explicit confirmation with a warning
- Automatic timeout (30 seconds) for kubectl commands

## Environment Variables

```bash
# Authentication is handled by Copilot CLI (GitHub login)
# No LLM API keys needed.

# K8s Docs MCP (optional)
K8S_DOCS_SEARCH_API_KEY=  # Google Custom Search API key for improved k8s docs search
```

## Development

```bash
# Build main app and MCP server
npm run build

# Run in development mode (requires tsx)
npm run dev
```

## License

MIT

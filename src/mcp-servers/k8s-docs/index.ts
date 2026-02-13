#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  searchK8sDocs,
  fetchK8sDocPage,
  searchK8sDocsSchema,
  fetchK8sDocPageSchema,
} from "./tools.js";

const server = new McpServer({
  name: "k8s-docs",
  version: "1.0.0",
});

server.tool(
  searchK8sDocsSchema.name,
  searchK8sDocsSchema.description,
  { query: searchK8sDocsSchema.inputSchema.shape.query },
  async ({ query }) => {
    const results = await searchK8sDocs(query);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

server.tool(
  fetchK8sDocPageSchema.name,
  fetchK8sDocPageSchema.description,
  { url: fetchK8sDocPageSchema.inputSchema.shape.url },
  async ({ url }) => {
    const result = await fetchK8sDocPage(url);
    return {
      content: [
        {
          type: "text" as const,
          text: `# ${result.title}\n\nSource: ${result.url}\n\n${result.content}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server error:", error);
  process.exit(1);
});

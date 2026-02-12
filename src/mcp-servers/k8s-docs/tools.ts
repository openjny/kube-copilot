import { z } from "zod";
import TurndownService from "turndown";

const turndown = new TurndownService({ headingStyle: "atx" });

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * Fetch a kubernetes.io page and convert to Markdown.
 */
export async function fetchK8sDocPage(
  url: string
): Promise<{ title: string; url: string; content: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const html = await response.text();

  // Extract title
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/ \| Kubernetes$/, "") : url;

  // Extract main content area
  const mainMatch = html.match(
    /<main[^>]*>([\s\S]*?)<\/main>/i
  );
  const contentHtml = mainMatch ? mainMatch[1] : html;

  const markdown = turndown.turndown(contentHtml);

  return { title, url, content: markdown };
}

/**
 * Search kubernetes.io docs using Google Custom Search or sitemap fallback.
 */
export async function searchK8sDocs(
  query: string
): Promise<SearchResult[]> {
  const apiKey = process.env["K8S_DOCS_SEARCH_API_KEY"];

  if (apiKey) {
    return searchWithGoogle(query, apiKey);
  }
  return searchWithSitemap(query);
}

async function searchWithGoogle(
  query: string,
  apiKey: string
): Promise<SearchResult[]> {
  // Google Custom Search Engine scoped to kubernetes.io
  const cseId = "011673866795133980826:kubernetes";
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cseId);
  url.searchParams.set("q", `${query} site:kubernetes.io`);
  url.searchParams.set("num", "5");

  const response = await fetch(url.toString());
  if (!response.ok) {
    // Fallback to sitemap search on API failure
    return searchWithSitemap(query);
  }

  const data = (await response.json()) as {
    items?: Array<{ title: string; link: string; snippet: string }>;
  };

  if (!data.items) return [];

  return data.items.map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
  }));
}

async function searchWithSitemap(query: string): Promise<SearchResult[]> {
  const sitemapUrl = "https://kubernetes.io/sitemap.xml";
  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  // Extract URLs from sitemap
  const urlMatches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  const urls: string[] = [];
  for (const match of urlMatches) {
    urls.push(match[1]);
  }

  // Filter URLs matching the query keywords
  const keywords = query.toLowerCase().split(/\s+/);
  const matches = urls
    .filter((url) => {
      const path = url.toLowerCase();
      return keywords.some((kw) => path.includes(kw));
    })
    .slice(0, 10);

  return matches.map((url) => {
    const parts = url.split("/").filter(Boolean);
    const title = parts[parts.length - 1]
      .replace(/-/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
    return { title, url };
  });
}

// Tool parameter schemas for MCP registration
export const searchK8sDocsSchema = {
  name: "search_k8s_docs",
  description: "Search kubernetes.io documentation by keyword",
  inputSchema: z.object({
    query: z.string().describe("Search query keywords"),
  }),
};

export const fetchK8sDocPageSchema = {
  name: "fetch_k8s_doc_page",
  description:
    "Fetch a Kubernetes documentation page by URL and convert to Markdown",
  inputSchema: z.object({
    url: z
      .string()
      .url()
      .describe("Full URL of the kubernetes.io page to fetch"),
  }),
};

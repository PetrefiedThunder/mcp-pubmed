#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  searchArticlesSchema,
  getArticleSchema,
  getCitationsSchema,
  getRelatedSchema,
  searchMeshSchema,
  getFullTextLinksSchema,
  searchArticles,
  getArticle,
  getCitations,
  getRelated,
  searchMesh,
  getFullTextLinks,
} from "./tools.js";

const server = new McpServer({
  name: "mcp-pubmed",
  version: "1.0.0",
});

server.tool(
  "search_articles",
  "Search PubMed for biomedical articles. Supports full PubMed query syntax including field tags ([Title], [Author], [MeSH]), boolean operators (AND, OR, NOT), and date ranges.",
  searchArticlesSchema.shape,
  async (args) => ({
    content: [{ type: "text", text: await searchArticles(searchArticlesSchema.parse(args)) }],
  })
);

server.tool(
  "get_article",
  "Get full metadata for a specific PubMed article by PMID, including title, abstract, authors, journal, publication date, DOI, and MeSH terms.",
  getArticleSchema.shape,
  async (args) => ({
    content: [{ type: "text", text: await getArticle(getArticleSchema.parse(args)) }],
  })
);

server.tool(
  "get_citations",
  "Get articles that cite a given PubMed article (PMID). Useful for forward citation tracking.",
  getCitationsSchema.shape,
  async (args) => ({
    content: [{ type: "text", text: await getCitations(getCitationsSchema.parse(args)) }],
  })
);

server.tool(
  "get_related",
  "Get related articles for a given PubMed article (PMID), ranked by relevance using NCBI's algorithm.",
  getRelatedSchema.shape,
  async (args) => ({
    content: [{ type: "text", text: await getRelated(getRelatedSchema.parse(args)) }],
  })
);

server.tool(
  "search_mesh",
  "Search the Medical Subject Headings (MeSH) vocabulary. Useful for finding standardized biomedical terms, tree numbers, and scope notes.",
  searchMeshSchema.shape,
  async (args) => ({
    content: [{ type: "text", text: await searchMesh(searchMeshSchema.parse(args)) }],
  })
);

server.tool(
  "get_full_text_links",
  "Get links to free full text versions of an article (e.g., PubMed Central). Returns PMC links and publisher free-access URLs.",
  getFullTextLinksSchema.shape,
  async (args) => ({
    content: [{ type: "text", text: await getFullTextLinks(getFullTextLinksSchema.parse(args)) }],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-pubmed server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

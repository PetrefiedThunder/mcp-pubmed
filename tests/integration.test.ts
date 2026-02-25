import { describe, it, expect } from "vitest";
import { searchArticles, getArticle, searchMesh } from "../src/tools.js";

// Integration tests — hit the real NCBI API.
// Run with: npx vitest run tests/integration.test.ts
// These are skipped in CI by default (set RUN_INTEGRATION=1 to enable).

const skip = !process.env.RUN_INTEGRATION;

describe.skipIf(skip)("Integration: NCBI E-utilities", () => {
  it("search_articles returns results for 'CRISPR'", async () => {
    const result = JSON.parse(await searchArticles({ query: "CRISPR", max_results: 3, sort: "relevance" }));
    expect(result.total_count).toBeGreaterThan(0);
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.articles[0]).toHaveProperty("pmid");
    expect(result.articles[0]).toHaveProperty("title");
  }, 15000);

  it("get_article returns metadata for a known PMID", async () => {
    const result = JSON.parse(await getArticle({ pmid: "33526711" }));
    expect(result.pmid).toBe("33526711");
    expect(result.title).toBeTruthy();
    expect(result.authors.length).toBeGreaterThan(0);
  }, 15000);

  it("search_mesh returns results for 'diabetes'", async () => {
    const result = JSON.parse(await searchMesh({ query: "diabetes", max_results: 5 }));
    expect(result.total_count).toBeGreaterThan(0);
  }, 15000);
});

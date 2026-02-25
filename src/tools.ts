import { z } from "zod";
import { NcbiClient } from "./ncbi-client.js";
import { parseArticles, type ArticleMetadata } from "./xml-utils.js";

const client = new NcbiClient();

// --- Tool schemas ---

export const searchArticlesSchema = z.object({
  query: z.string().describe("PubMed search query (supports full PubMed syntax including [Title], [Author], [MeSH], date ranges, boolean operators)"),
  max_results: z.number().min(1).max(100).default(10).describe("Maximum results to return (1-100)"),
  sort: z.enum(["relevance", "pub_date", "Author", "JournalName"]).default("relevance").describe("Sort order"),
  min_date: z.string().optional().describe("Minimum publication date (YYYY or YYYY/MM or YYYY/MM/DD)"),
  max_date: z.string().optional().describe("Maximum publication date (YYYY or YYYY/MM or YYYY/MM/DD)"),
});

export const getArticleSchema = z.object({
  pmid: z.string().describe("PubMed ID"),
});

export const getCitationsSchema = z.object({
  pmid: z.string().describe("PubMed ID to find citing articles for"),
});

export const getRelatedSchema = z.object({
  pmid: z.string().describe("PubMed ID to find related articles for"),
  max_results: z.number().min(1).max(100).default(10).describe("Maximum results"),
});

export const searchMeshSchema = z.object({
  query: z.string().describe("MeSH term search query"),
  max_results: z.number().min(1).max(50).default(10).describe("Maximum results"),
});

export const getFullTextLinksSchema = z.object({
  pmid: z.string().describe("PubMed ID to find full text links for"),
});

// --- Tool implementations ---

export async function searchArticles(args: z.infer<typeof searchArticlesSchema>): Promise<string> {
  // Step 1: search
  const searchResult = await client.esearch(args.query, {
    retmax: args.max_results,
    sort: args.sort,
    mindate: args.min_date,
    maxdate: args.max_date,
    datetype: args.min_date || args.max_date ? "pdat" : undefined,
  }) as { esearchresult: { idlist: string[]; count: string; querytranslation: string } };

  const ids = searchResult.esearchresult.idlist;
  const totalCount = searchResult.esearchresult.count;
  const queryTranslation = searchResult.esearchresult.querytranslation;

  if (ids.length === 0) {
    return JSON.stringify({ total_count: 0, query_translation: queryTranslation, articles: [] }, null, 2);
  }

  // Step 2: fetch article details
  const xml = await client.efetch(ids);
  const articles = parseArticles(xml);

  return JSON.stringify({
    total_count: parseInt(totalCount),
    query_translation: queryTranslation,
    showing: articles.length,
    articles: articles.map(formatArticleSummary),
  }, null, 2);
}

export async function getArticle(args: z.infer<typeof getArticleSchema>): Promise<string> {
  const xml = await client.efetch([args.pmid]);
  const articles = parseArticles(xml);
  if (articles.length === 0) {
    return JSON.stringify({ error: `No article found for PMID ${args.pmid}` });
  }
  return JSON.stringify(articles[0], null, 2);
}

export async function getCitations(args: z.infer<typeof getCitationsSchema>): Promise<string> {
  const result = await client.elink([args.pmid], "pubmed_pubmed_citedin") as {
    linksets?: Array<{ linksetdbs?: Array<{ links?: string[] }> }>;
  };

  const links = result.linksets?.[0]?.linksetdbs?.[0]?.links || [];

  if (links.length === 0) {
    return JSON.stringify({ pmid: args.pmid, citing_count: 0, citing_articles: [] }, null, 2);
  }

  // Fetch summaries for citing articles (max 20)
  const fetchIds = links.slice(0, 20);
  const xml = await client.efetch(fetchIds);
  const articles = parseArticles(xml);

  return JSON.stringify({
    pmid: args.pmid,
    citing_count: links.length,
    showing: articles.length,
    citing_articles: articles.map(formatArticleSummary),
  }, null, 2);
}

export async function getRelated(args: z.infer<typeof getRelatedSchema>): Promise<string> {
  const result = await client.elink([args.pmid], "pubmed_pubmed") as {
    linksets?: Array<{ linksetdbs?: Array<{ links?: string[] }> }>;
  };

  const links = result.linksets?.[0]?.linksetdbs?.[0]?.links || [];

  if (links.length === 0) {
    return JSON.stringify({ pmid: args.pmid, related_count: 0, related_articles: [] }, null, 2);
  }

  // Skip first (it's usually the query article itself)
  const fetchIds = links.filter((id: string) => id !== args.pmid).slice(0, args.max_results);
  if (fetchIds.length === 0) {
    return JSON.stringify({ pmid: args.pmid, related_count: 0, related_articles: [] }, null, 2);
  }

  const xml = await client.efetch(fetchIds);
  const articles = parseArticles(xml);

  return JSON.stringify({
    pmid: args.pmid,
    related_count: links.length - 1,
    showing: articles.length,
    related_articles: articles.map(formatArticleSummary),
  }, null, 2);
}

export async function searchMesh(args: z.infer<typeof searchMeshSchema>): Promise<string> {
  const searchResult = await client.fetchJson("esearch.fcgi", {
    db: "mesh",
    term: args.query,
    retmax: String(args.max_results),
  }) as { esearchresult: { idlist: string[]; count: string } };

  const ids = searchResult.esearchresult.idlist;
  if (ids.length === 0) {
    return JSON.stringify({ total_count: 0, terms: [] }, null, 2);
  }

  // Fetch MeSH summaries
  const summaryResult = await client.fetchJson("esummary.fcgi", {
    db: "mesh",
    id: ids.join(","),
    version: "2.0",
  }) as { result?: Record<string, unknown> };

  const terms: Array<Record<string, unknown>> = [];
  if (summaryResult.result) {
    for (const id of ids) {
      const entry = summaryResult.result[id] as Record<string, unknown> | undefined;
      if (entry) {
        terms.push({
          uid: id,
          name: entry.ds_meshterms || entry.ds_meshui || id,
          scope_note: entry.ds_scopenote || "",
          tree_numbers: entry.ds_treenumberlist || [],
        });
      }
    }
  }

  return JSON.stringify({
    total_count: parseInt(searchResult.esearchresult.count),
    showing: terms.length,
    terms,
  }, null, 2);
}

export async function getFullTextLinks(args: z.infer<typeof getFullTextLinksSchema>): Promise<string> {
  // Use elink to find PMC links and provider links
  const result = await client.elinkCmd([args.pmid], "llinks", "pubmed") as {
    linksets?: Array<{
      idurllist?: Array<{
        objurls?: Array<{
          url?: { value?: string };
          linkname?: string;
          provider?: { name?: string[] };
          categories?: Array<{ category?: string }>;
        }>;
      }>;
    }>;
  };

  // Also check for PMC link
  const pmcResult = await client.elink([args.pmid], "pubmed_pmc", "pubmed", "pmc") as {
    linksets?: Array<{ linksetdbs?: Array<{ links?: string[] }> }>;
  };

  const pmcIds = pmcResult.linksets?.[0]?.linksetdbs?.[0]?.links || [];
  const links: Array<Record<string, string>> = [];

  if (pmcIds.length > 0) {
    links.push({
      source: "PubMed Central",
      url: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcIds[0]}/`,
      pmcid: `PMC${pmcIds[0]}`,
    });
  }

  // Extract provider links
  const urlList = result.linksets?.[0]?.idurllist?.[0]?.objurls || [];
  for (const obj of urlList) {
    const url = obj.url?.value;
    if (url) {
      links.push({
        source: obj.provider?.name?.[0] || obj.linkname || "Unknown",
        url,
      });
    }
  }

  return JSON.stringify({
    pmid: args.pmid,
    full_text_links: links,
    has_free_full_text: links.length > 0,
  }, null, 2);
}

function formatArticleSummary(a: ArticleMetadata) {
  return {
    pmid: a.pmid,
    title: a.title,
    authors: a.authors.slice(0, 5).join(", ") + (a.authors.length > 5 ? " et al." : ""),
    journal: a.journal,
    pub_date: a.pubDate,
    doi: a.doi || undefined,
    abstract: a.abstract.length > 500 ? a.abstract.slice(0, 500) + "..." : a.abstract,
  };
}

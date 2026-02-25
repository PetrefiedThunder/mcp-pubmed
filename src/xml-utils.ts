/**
 * Minimal XML parsing helpers — no external deps.
 * These work on the PubMed XML format specifically.
 */

export function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

export function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

export function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1] : "";
}

export function stripTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, "").trim();
}

export interface ArticleMetadata {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  pubDate: string;
  doi: string;
  meshTerms: string[];
}

export function parseArticles(xml: string): ArticleMetadata[] {
  const articles = extractAllBlocks(xml, "PubmedArticle");
  return articles.map(parseOneArticle);
}

function extractAllBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) || [];
}

function parseOneArticle(block: string): ArticleMetadata {
  const pmid = extractTag(block, "PMID");
  const title = stripTags(extractTag(block, "ArticleTitle"));
  
  // Abstract can have multiple AbstractText sections
  const abstractTexts = extractAllTags(block, "AbstractText");
  const abstract = abstractTexts.map(stripTags).join("\n\n") || stripTags(extractTag(block, "AbstractText"));
  
  // Authors
  const authorBlocks = extractAllBlocks(block, "Author");
  const authors = authorBlocks.map((a) => {
    const last = stripTags(extractTag(a, "LastName"));
    const fore = stripTags(extractTag(a, "ForeName"));
    return [fore, last].filter(Boolean).join(" ");
  }).filter(Boolean);

  // Journal
  const journal = stripTags(extractTag(block, "Title"));

  // Publication date
  const pubDateBlock = block.match(/<PubDate>[\s\S]*?<\/PubDate>/)?.[0] || "";
  const year = extractTag(pubDateBlock, "Year");
  const month = extractTag(pubDateBlock, "Month");
  const day = extractTag(pubDateBlock, "Day");
  const pubDate = [year, month, day].filter(Boolean).join(" ");

  // DOI
  const doiMatch = block.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
  const doi = doiMatch ? doiMatch[1] : "";

  // MeSH terms
  const meshBlocks = extractAllBlocks(block, "MeshHeading");
  const meshTerms = meshBlocks.map((m) => stripTags(extractTag(m, "DescriptorName"))).filter(Boolean);

  return { pmid, title, abstract, authors, journal, pubDate, doi, meshTerms };
}

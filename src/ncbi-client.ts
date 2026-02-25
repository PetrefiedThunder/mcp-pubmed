/**
 * NCBI E-utilities HTTP client with rate limiting.
 *
 * Rate limits:
 *  - Without API key: 3 requests/second
 *  - With API key: 10 requests/second
 */

const BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

interface ClientOptions {
  apiKey?: string;
  tool?: string;
  email?: string;
}

export class NcbiClient {
  private apiKey?: string;
  private tool: string;
  private email: string;
  private lastRequestTime = 0;
  private minInterval: number; // ms between requests

  constructor(opts: ClientOptions = {}) {
    this.apiKey = opts.apiKey || process.env.NCBI_API_KEY;
    this.tool = opts.tool || "mcp-pubmed";
    this.email = opts.email || process.env.NCBI_EMAIL || "mcp-pubmed@users.noreply.github.com";
    this.minInterval = this.apiKey ? 100 : 334; // 10/s vs 3/s
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise((r) => setTimeout(r, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private baseParams(): Record<string, string> {
    const params: Record<string, string> = {
      tool: this.tool,
      email: this.email,
    };
    if (this.apiKey) params.api_key = this.apiKey;
    return params;
  }

  async fetch(endpoint: string, params: Record<string, string>): Promise<string> {
    await this.throttle();
    const allParams = { ...this.baseParams(), ...params };
    const url = `${BASE_URL}/${endpoint}?${new URLSearchParams(allParams).toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`NCBI API error: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }

  async fetchJson(endpoint: string, params: Record<string, string>): Promise<unknown> {
    const text = await this.fetch(endpoint, { ...params, retmode: "json" });
    return JSON.parse(text);
  }

  // --- High-level methods ---

  async esearch(query: string, opts: { retmax?: number; sort?: string; retstart?: number; mindate?: string; maxdate?: string; datetype?: string } = {}): Promise<unknown> {
    const params: Record<string, string> = {
      db: "pubmed",
      term: query,
      retmax: String(opts.retmax ?? 20),
      retmode: "json",
      usehistory: "y",
    };
    if (opts.sort) params.sort = opts.sort;
    if (opts.retstart) params.retstart = String(opts.retstart);
    if (opts.mindate) params.mindate = opts.mindate;
    if (opts.maxdate) params.maxdate = opts.maxdate;
    if (opts.datetype) params.datetype = opts.datetype ?? "pdat";
    return this.fetchJson("esearch.fcgi", params);
  }

  async esummary(ids: string[]): Promise<unknown> {
    return this.fetchJson("esummary.fcgi", {
      db: "pubmed",
      id: ids.join(","),
      version: "2.0",
    });
  }

  async efetch(ids: string[], rettype = "abstract", retmode = "xml"): Promise<string> {
    return this.fetch("efetch.fcgi", {
      db: "pubmed",
      id: ids.join(","),
      rettype,
      retmode,
    });
  }

  async elink(ids: string[], linkname: string, dbfrom = "pubmed", db = "pubmed"): Promise<unknown> {
    return this.fetchJson("elink.fcgi", {
      dbfrom,
      db,
      id: ids.join(","),
      linkname,
      retmode: "json",
    });
  }

  async elinkCmd(ids: string[], cmd: string, dbfrom = "pubmed", db = "pubmed"): Promise<unknown> {
    return this.fetchJson("elink.fcgi", {
      dbfrom,
      db,
      id: ids.join(","),
      cmd,
      retmode: "json",
    });
  }

  async einfo(db?: string): Promise<unknown> {
    const params: Record<string, string> = { retmode: "json" };
    if (db) params.db = db;
    return this.fetchJson("einfo.fcgi", params);
  }
}

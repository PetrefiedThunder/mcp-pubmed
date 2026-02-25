# mcp-pubmed

An MCP (Model Context Protocol) server that provides access to PubMed and NCBI's biomedical literature database. Search articles, retrieve metadata, track citations, explore related research, browse MeSH vocabulary, and find free full-text links — all through a standardized MCP interface.

## Tools

| Tool | Description |
|------|-------------|
| `search_articles` | Search PubMed by query with full PubMed syntax support (field tags, booleans, date ranges) |
| `get_article` | Get complete metadata for a PMID (title, abstract, authors, journal, date, DOI, MeSH terms) |
| `get_citations` | Find articles that cite a given PMID (forward citation tracking) |
| `get_related` | Get related articles ranked by NCBI's relevance algorithm |
| `search_mesh` | Search Medical Subject Headings (MeSH) vocabulary |
| `get_full_text_links` | Find free full-text links (PubMed Central, publisher open access) |

## Installation

```bash
npm install -g mcp-pubmed
```

Or clone and build:

```bash
git clone https://github.com/PetrefiedThunder/mcp-pubmed.git
cd mcp-pubmed
npm install
npm run build
```

## NCBI API Key (Optional)

Without an API key, requests are limited to **3 per second**. With a key, the limit increases to **10 per second**.

1. Register at [NCBI](https://www.ncbi.nlm.nih.gov/account/)
2. Go to Settings → API Key Management → Create
3. Set the environment variable:

```bash
export NCBI_API_KEY=your_key_here
```

Optionally set your email for NCBI's usage tracking:

```bash
export NCBI_EMAIL=you@example.com
```

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pubmed": {
      "command": "npx",
      "args": ["-y", "mcp-pubmed"],
      "env": {
        "NCBI_API_KEY": "your_key_here"
      }
    }
  }
}
```

### OpenClaw / Generic MCP Client

```json
{
  "mcpServers": {
    "pubmed": {
      "command": "node",
      "args": ["/path/to/mcp-pubmed/dist/index.js"],
      "env": {
        "NCBI_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Example Queries

```
search_articles({ query: "CRISPR sickle cell", max_results: 5, sort: "pub_date" })
get_article({ pmid: "33526711" })
get_citations({ pmid: "33526711" })
get_related({ pmid: "33526711", max_results: 5 })
search_mesh({ query: "immunotherapy" })
get_full_text_links({ pmid: "33526711" })
```

## PubMed Search Syntax

The `search_articles` tool supports full PubMed query syntax:

- **Field tags:** `cancer[Title]`, `Smith J[Author]`, `Nature[Journal]`
- **Boolean operators:** `CRISPR AND sickle cell`, `diabetes OR obesity`
- **MeSH terms:** `"Neoplasms"[MeSH]`
- **Date ranges:** use `min_date`/`max_date` params (`2023`, `2023/01`, `2023/01/15`)
- **Proximity:** `"asthma treatment"[Title:~3]`

## Development

```bash
npm install
npm run dev        # Run with tsx (hot reload)
npm run build      # Compile TypeScript
npm test           # Run unit tests
RUN_INTEGRATION=1 npm test  # Run integration tests (hits NCBI API)
```

## License

MIT

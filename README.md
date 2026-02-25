# mcp-pubmed

Search PubMed for biomedical literature, abstracts, and citations via the NCBI E-utilities API.

> **Free API** — No API key required.

## Tools

| Tool | Description |
|------|-------------|
| `search_articles` | Search PubMed for biomedical articles. Supports full PubMed query syntax including field tags ([Title], [Author], [MeSH]), boolean operators (AND, OR, NOT), and date ranges. |
| `get_article` | Get full metadata for a specific PubMed article by PMID, including title, abstract, authors, journal, publication date, DOI, and MeSH terms. |
| `get_citations` | Get articles that cite a given PubMed article (PMID). Useful for forward citation tracking. |
| `get_related` | Get related articles for a given PubMed article (PMID), ranked by relevance using NCBI's algorithm. |
| `search_mesh` | Search the Medical Subject Headings (MeSH) vocabulary. Useful for finding standardized biomedical terms, tree numbers, and scope notes. |
| `get_full_text_links` | Get links to free full text versions of an article (e.g., PubMed Central). Returns PMC links and publisher free-access URLs. |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-pubmed.git
cd mcp-pubmed
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pubmed": {
      "command": "node",
      "args": ["/path/to/mcp-pubmed/dist/index.js"]
    }
  }
}
```

## Usage with npx

```bash
npx mcp-pubmed
```

## License

MIT

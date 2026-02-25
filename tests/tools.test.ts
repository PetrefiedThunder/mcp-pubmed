import { describe, it, expect } from "vitest";
import { parseArticles, extractTag, stripTags, extractAllTags } from "../src/xml-utils.js";

const SAMPLE_XML = `<?xml version="1.0" ?>
<PubmedArticleSet>
<PubmedArticle>
  <MedlineCitation>
    <PMID Version="1">12345678</PMID>
    <Article>
      <Journal>
        <Title>Nature Medicine</Title>
        <JournalIssue>
          <PubDate>
            <Year>2024</Year>
            <Month>Jan</Month>
            <Day>15</Day>
          </PubDate>
        </JournalIssue>
      </Journal>
      <ArticleTitle>CRISPR-based gene therapy for sickle cell disease</ArticleTitle>
      <Abstract>
        <AbstractText Label="BACKGROUND">Sickle cell disease affects millions worldwide.</AbstractText>
        <AbstractText Label="METHODS">We conducted a phase 3 trial.</AbstractText>
      </Abstract>
      <AuthorList>
        <Author>
          <LastName>Smith</LastName>
          <ForeName>John A</ForeName>
        </Author>
        <Author>
          <LastName>Doe</LastName>
          <ForeName>Jane B</ForeName>
        </Author>
      </AuthorList>
    </Article>
    <MeshHeadingList>
      <MeshHeading>
        <DescriptorName>CRISPR-Cas Systems</DescriptorName>
      </MeshHeading>
      <MeshHeading>
        <DescriptorName>Anemia, Sickle Cell</DescriptorName>
      </MeshHeading>
    </MeshHeadingList>
  </MedlineCitation>
  <PubmedData>
    <ArticleIdList>
      <ArticleId IdType="doi">10.1038/s41591-024-00001-1</ArticleId>
    </ArticleIdList>
  </PubmedData>
</PubmedArticle>
</PubmedArticleSet>`;

describe("XML parsing", () => {
  it("extractTag gets content", () => {
    expect(extractTag("<Foo>bar</Foo>", "Foo")).toBe("bar");
  });

  it("extractTag returns empty for missing tag", () => {
    expect(extractTag("<Foo>bar</Foo>", "Baz")).toBe("");
  });

  it("stripTags removes XML tags", () => {
    expect(stripTags("<b>hello</b> <i>world</i>")).toBe("hello world");
  });

  it("extractAllTags gets multiple matches", () => {
    const result = extractAllTags("<A>1</A><A>2</A><A>3</A>", "A");
    expect(result).toEqual(["1", "2", "3"]);
  });
});

describe("parseArticles", () => {
  it("parses a PubMed XML article correctly", () => {
    const articles = parseArticles(SAMPLE_XML);
    expect(articles).toHaveLength(1);

    const a = articles[0];
    expect(a.pmid).toBe("12345678");
    expect(a.title).toBe("CRISPR-based gene therapy for sickle cell disease");
    expect(a.authors).toEqual(["John A Smith", "Jane B Doe"]);
    expect(a.journal).toBe("Nature Medicine");
    expect(a.pubDate).toBe("2024 Jan 15");
    expect(a.doi).toBe("10.1038/s41591-024-00001-1");
    expect(a.meshTerms).toContain("CRISPR-Cas Systems");
    expect(a.meshTerms).toContain("Anemia, Sickle Cell");
    expect(a.abstract).toContain("Sickle cell disease");
    expect(a.abstract).toContain("phase 3 trial");
  });
});

/**
 * `literature`: PubMed and PubMed Central (E-utilities), Europe PMC
 * (including bioRxiv and medRxiv preprints), the bioRxiv API and OpenAlex.
 */
import { z } from "zod";
import { connector, type Source, tool } from "../kit/connector.ts";
import { EUTILS, ncbiSummaries } from "../kit/ncbi.ts";
import { ncbiParams, withQuery } from "../kit/upstream.ts";

const PUBMED: Source = {
  name: "PubMed",
  attribution: "Citations from PubMed (National Library of Medicine). Abstracts may be copyrighted by their publishers.",
  terms: "https://www.ncbi.nlm.nih.gov/home/about/policies/",
};
const EUROPEPMC: Source = {
  name: "Europe PMC",
  attribution: "Data from Europe PMC (EMBL-EBI).",
  terms: "https://europepmc.org/Copyright",
};
const BIORXIV: Source = {
  name: "bioRxiv / medRxiv",
  attribution: "Preprint metadata from bioRxiv and medRxiv (Cold Spring Harbor Laboratory); preprints are not peer reviewed.",
  terms: "https://www.biorxiv.org/about-biorxiv",
};
const OPENALEX: Source = {
  name: "OpenAlex",
  attribution: "Data from OpenAlex (OurResearch), CC0.",
  terms: "https://openalex.org/about",
};

const pmid = z.string().regex(/^\d{1,9}$/);
const doi = z.string().regex(/^10\.\d{4,9}\/\S+$/, "a DOI, e.g. 10.1038/nature12373");

export default connector({
  name: "literature",
  version: "0.1.0",
  tools: [
    tool({
      name: "search_pubmed",
      description: "Search PubMed with its query syntax (e.g. 'CRISPR screen[tiab] AND 2024[dp]'): PMIDs, titles, journals, dates, authors and DOIs.",
      input: z.object({
        query: z.string().min(1).max(1000),
        limit: z.int().min(1).max(50).default(10),
        sort: z.enum(["relevance", "pub_date"]).default("relevance"),
      }),
      sources: [PUBMED],
      async run({ query, limit, sort }, ctx) {
        const { count, items } = await ncbiSummaries(ctx, "pubmed", query, limit, { sort });
        return {
          count,
          articles: items.map((a) => {
            const x = a as Record<string, unknown> & {
              authors?: { name: string }[];
              articleids?: { idtype: string; value: string }[];
            };
            return {
              pmid: x.uid,
              title: x.title,
              journal: x.fulljournalname ?? x.source,
              date: x.pubdate,
              authors: (x.authors ?? []).slice(0, 6).map((au) => au.name),
              doi: x.articleids?.find((i) => i.idtype === "doi")?.value,
              pmcid: x.articleids?.find((i) => i.idtype === "pmc")?.value,
            };
          }),
        };
      },
    }),
    tool({
      name: "get_abstracts",
      description: "Abstracts of up to 20 PubMed articles by PMID, as plain text.",
      input: z.object({ pmids: z.array(pmid).min(1).max(20) }),
      sources: [PUBMED],
      async run({ pmids }, { http, env }) {
        const text = await http.text(
          withQuery(`${EUTILS}/efetch.fcgi`, {
            db: "pubmed",
            id: pmids.join(","),
            rettype: "abstract",
            retmode: "text",
            ...ncbiParams(env),
          }),
        );
        return { abstracts: text };
      },
    }),
    tool({
      name: "search_europepmc",
      description: "Search Europe PMC (articles, preprints, full text) with its syntax; `preprints` limits to bioRxiv/medRxiv and other preprint servers.",
      input: z.object({
        query: z.string().min(1).max(1000),
        preprints: z.boolean().default(false),
        limit: z.int().min(1).max(50).default(10),
      }),
      sources: [EUROPEPMC],
      async run({ query, preprints, limit }, { http }) {
        const data = await http.json<{ hitCount?: number; resultList?: { result?: Record<string, unknown>[] } }>(
          withQuery("https://www.ebi.ac.uk/europepmc/webservices/rest/search", {
            query: preprints ? `(${query}) AND SRC:PPR` : query,
            format: "json",
            pageSize: limit,
            resultType: "lite",
          }),
        );
        return {
          count: data.hitCount ?? 0,
          results: (data.resultList?.result ?? []).map((r) => ({
            id: r.id,
            source: r.source,
            title: r.title,
            authors: r.authorString,
            journal: r.journalTitle,
            year: r.pubYear,
            doi: r.doi,
            pmid: r.pmid,
            pmcid: r.pmcid,
            citedBy: r.citedByCount,
          })),
        };
      },
    }),
    tool({
      name: "get_preprint",
      description: "bioRxiv or medRxiv metadata of one preprint by DOI, with every version and its publication status.",
      input: z.object({ doi, server: z.enum(["biorxiv", "medrxiv"]).default("biorxiv") }),
      sources: [BIORXIV],
      async run({ doi: d, server }, { http }) {
        return http.json(`https://api.biorxiv.org/details/${server}/${d}`);
      },
    }),
    tool({
      name: "search_openalex",
      description: "Search scholarly works in OpenAlex: titles, years, DOIs, citation counts and open-access links.",
      input: z.object({
        query: z.string().min(1).max(500),
        fromYear: z.int().min(1900).max(2100).optional(),
        limit: z.int().min(1).max(50).default(10),
      }),
      sources: [OPENALEX],
      async run({ query, fromYear, limit }, { http, env }) {
        const data = await http.json<{ meta?: { count?: number }; results?: Record<string, unknown>[] }>(
          withQuery("https://api.openalex.org/works", {
            search: query,
            "per-page": limit,
            filter: fromYear === undefined ? undefined : `from_publication_date:${fromYear}-01-01`,
            mailto: env.CONTACT_EMAIL,
          }),
        );
        return { count: data.meta?.count ?? 0, works: (data.results ?? []).map(work) };
      },
    }),
    tool({
      name: "get_works",
      description: "Up to 25 works from OpenAlex by DOI.",
      input: z.object({ dois: z.array(doi).min(1).max(25) }),
      sources: [OPENALEX],
      async run({ dois }, { http, env }) {
        const data = await http.json<{ results?: Record<string, unknown>[] }>(
          withQuery("https://api.openalex.org/works", {
            filter: `doi:${dois.join("|")}`,
            "per-page": dois.length,
            mailto: env.CONTACT_EMAIL,
          }),
        );
        return { works: (data.results ?? []).map(work) };
      },
    }),
  ],
});

function work(w: Record<string, unknown>) {
  const oa = (w.open_access ?? {}) as { is_oa?: boolean; oa_url?: string };
  return {
    id: w.id,
    doi: w.doi,
    title: w.display_name,
    year: w.publication_year,
    type: w.type,
    citedBy: w.cited_by_count,
    openAccess: oa.is_oa ? oa.oa_url : undefined,
  };
}

/**
 * The hosted connectors (ADR 0041) against fake upstream APIs: the MCP
 * endpoint lists consistent tools, calls reach the documented upstream
 * URLs, every result names its source and terms, failures are tool errors,
 * and the per-caller rate limit answers 429.
 */
import { describe, expect, it } from "vitest";
import chemistry from "./chemistry/index.ts";
import genomes from "./genomes/index.ts";
import { connector, type Env, render, RESULT_MAX_CHARS, tool } from "./kit/connector.ts";
import literature from "./literature/index.ts";
import proteins from "./proteins/index.ts";
import { z } from "zod";

type Route = (url: URL, init?: RequestInit) => unknown;

/** A fetch answering upstream requests from `routes` (by host and path prefix), recording them. */
function fakeUpstream(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push(`${init?.method ?? "GET"} ${url.host}${url.pathname}`);
    const key = Object.keys(routes).find((k) => `${url.host}${url.pathname}`.startsWith(k));
    if (key === undefined) return new Response("not found", { status: 404 });
    const body = (routes[key] as Route)(url, init);
    return typeof body === "string" ? new Response(body) : Response.json(body);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

async function rpc(
  worker: { fetch(request: Request, env: Env): Promise<Response> },
  method: string,
  params: unknown,
  env: Env = {},
) {
  const response = await worker.fetch(
    new Request("https://connector.test/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    env,
  );
  const text = await response.text();
  const data = text.trimStart().startsWith("{")
    ? text
    : (text.split("\n").find((l) => l.startsWith("data:")) ?? "data:null").slice(5);
  return { status: response.status, body: JSON.parse(data) };
}

const call = async (worker: Parameters<typeof rpc>[0], name: string, args: unknown) => {
  const { body } = await rpc(worker, "tools/call", { name, arguments: args });
  const result = body.result as { isError?: boolean; content: { text: string }[] };
  return { isError: result.isError === true, text: result.content[0]?.text ?? "" };
};

describe("the kit", () => {
  it("answers health and 404, and rate limits per caller", async () => {
    const worker = connector({ name: "x", version: "0.0.1", tools: [] });
    const health = await worker.fetch(new Request("https://c.test/healthz"), {});
    expect(await health.json()).toEqual({ name: "x", version: "0.0.1", tools: [] });
    expect((await worker.fetch(new Request("https://c.test/other"), {})).status).toBe(404);
    // On the shared host the connector's name prefixes the path.
    expect((await worker.fetch(new Request("https://c.test/x/healthz"), {})).status).toBe(200);
    const keys: string[] = [];
    const limited = await rpc(worker, "tools/list", {}, {
      RATE_LIMITER: {
        limit: async ({ key }) => {
          keys.push(key);
          return { success: false };
        },
      },
    });
    expect(limited).toEqual({ status: 429, body: { error: "rate limited; retry in a minute" } });
    const response = await worker.fetch(
      new Request("https://c.test/mcp", { method: "POST", headers: { "x-tumbleweed-user": "u1" }, body: "{}" }),
      { RATE_LIMITER: { limit: async ({ key }) => ({ success: key !== "u1" }) } },
    );
    expect(response.status).toBe(429);
    expect(keys).toEqual(["anonymous"]);
  });

  it("frames results with attribution and caps their size", () => {
    const text = render({ a: "x".repeat(RESULT_MAX_CHARS + 10) }, [
      { name: "S", attribution: "From S.", terms: "https://s.test/terms" },
    ]);
    expect(text).toContain("(truncated");
    expect(text.endsWith("Source: S: From S. Terms: https://s.test/terms")).toBe(true);
  });

  it("turns a failing upstream into a tool error, not a protocol error", async () => {
    const { fetchImpl } = fakeUpstream({});
    const worker = connector(
      {
        name: "x",
        version: "0",
        tools: [
          tool({
            name: "boom",
            description: "fails",
            input: z.object({}),
            sources: [],
            run: async (_a, { http }) => http.json("https://down.test/x"),
          }),
        ],
      },
      { fetch: fetchImpl },
    );
    expect(await call(worker, "boom", {})).toEqual({ isError: true, text: "boom failed: down.test answered HTTP 404" });
  });
});

describe("connectors", () => {
  it("each lists its search, get and batch tools", async () => {
    const names = async (w: Parameters<typeof rpc>[0]) =>
      ((await rpc(w, "tools/list", {})).body.result.tools as { name: string }[]).map((t) => t.name);
    expect(await names(genomes)).toEqual([
      "search_genes",
      "get_genes",
      "get_variant",
      "search_clinvar",
      "get_gnomad_variant",
      "get_sequence",
    ]);
    expect(await names(proteins)).toContain("get_alphafold_model");
    expect(await names(chemistry)).toContain("get_activities");
    expect(await names(literature)).toContain("search_pubmed");
  });
});

describe("upstream calls", () => {
  it("genomes: NCBI Gene search and a UCSC sequence", async () => {
    const { fetchImpl, calls } = fakeUpstream({
      "eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch": () => ({ esearchresult: { idlist: ["672"], count: "1" } }),
      "eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary": () => ({
        result: { uids: ["672"], "672": { uid: "672", name: "BRCA1", description: "BRCA1 DNA repair", chromosome: "17" } },
      }),
      "api.genome.ucsc.edu/getData/sequence": () => ({ dna: "ACGT" }),
    });
    const g = genomes;
    // The Workers' default exports use the global fetch.
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const genes = await call(g, "search_genes", { query: "BRCA1", limit: 1 });
      expect(genes.isError).toBe(false);
      expect(genes.text).toContain('"symbol": "BRCA1"');
      expect(genes.text).toContain("Source: NCBI");
      const seq = await call(g, "get_sequence", { chrom: "chr17", start: 0, end: 4 });
      expect(seq.text).toContain('"dna": "ACGT"');
      const tooLong = await call(g, "get_sequence", { chrom: "chr17", start: 0, end: 20_000 });
      expect(tooLong).toMatchObject({ isError: true });
    } finally {
      globalThis.fetch = original;
    }
    expect(calls).toEqual([
      "GET eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
      "GET eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
      "GET api.genome.ucsc.edu/getData/sequence",
    ]);
  });

  it("proteins, chemistry and literature reach their sources", async () => {
    const { fetchImpl, calls } = fakeUpstream({
      "rest.uniprot.org/uniprotkb/search": (url) => ({ results: [{ primaryAccession: "P04637", q: url.searchParams.get("query") }] }),
      "alphafold.ebi.ac.uk/api/prediction/P04637": () => [{ entryId: "AF-P04637-F1", globalMetricValue: 75 }],
      "www.ebi.ac.uk/chembl/api/data/activity.json": (url) => ({
        page_meta: { total_count: 1 },
        activities: [{ molecule_chembl_id: "CHEMBL25", target_chembl_id: url.searchParams.get("target_chembl_id"), pchembl_value: "7.1" }],
      }),
      "www.ebi.ac.uk/europepmc/webservices/rest/search": (url) => ({
        hitCount: 1,
        resultList: { result: [{ id: "PPR1", source: "PPR", title: url.searchParams.get("query") }] },
      }),
    });
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      expect((await call(proteins, "search_proteins", { query: "gene:TP53" })).text).toContain("gene:TP53");
      expect((await call(proteins, "get_alphafold_model", { accession: "P04637" })).text).toContain("AlphaFold DB");
      const acts = await call(chemistry, "get_activities", { target: "CHEMBL203" });
      expect(acts.text).toContain('"target": "CHEMBL203"');
      expect(acts.text).toContain("CC BY-SA 3.0");
      expect((await call(chemistry, "get_activities", {})).isError).toBe(true);
      const pre = await call(literature, "search_europepmc", { query: "CRISPR", preprints: true });
      expect(pre.text).toContain("(CRISPR) AND SRC:PPR");
    } finally {
      globalThis.fetch = original;
    }
    expect(calls).toContain("GET www.ebi.ac.uk/chembl/api/data/activity.json");
  });
});

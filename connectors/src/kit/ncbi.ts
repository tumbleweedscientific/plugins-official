/** NCBI E-utilities: esearch then esummary, with the usage policy's parameters. */
import type { ToolContext } from "./connector.ts";
import { ncbiParams, withQuery } from "./upstream.ts";

export const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export async function ncbiSummaries(
  { http, env }: ToolContext,
  db: string,
  term: string,
  limit: number,
  extra: Record<string, string> = {},
) {
  const search = await http.json<{ esearchresult?: { idlist?: string[]; count?: string } }>(
    withQuery(`${EUTILS}/esearch.fcgi`, { db, term, retmode: "json", retmax: limit, ...extra, ...ncbiParams(env) }),
  );
  const ids = search.esearchresult?.idlist ?? [];
  if (ids.length === 0) return { count: 0, items: [] };
  const summary = await http.json<{ result?: Record<string, unknown> & { uids?: string[] } }>(
    withQuery(`${EUTILS}/esummary.fcgi`, { db, id: ids.join(","), retmode: "json", ...ncbiParams(env) }),
  );
  const result = summary.result ?? {};
  return {
    count: Number(search.esearchresult?.count ?? ids.length),
    items: (result.uids ?? ids).map((uid) => result[uid]),
  };
}


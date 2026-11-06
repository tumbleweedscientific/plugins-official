/**
 * `proteins`: sequences and annotation from UniProt, domains from InterPro,
 * experimental structures from the RCSB PDB and predicted ones from the
 * AlphaFold Protein Structure Database.
 */
import { z } from "zod";
import { connector, type Source, tool } from "../kit/connector.ts";
import { withQuery } from "../kit/upstream.ts";

const UNIPROT: Source = {
  name: "UniProt",
  attribution: "Data from UniProt (The UniProt Consortium), CC BY 4.0.",
  terms: "https://www.uniprot.org/help/license",
};
const INTERPRO: Source = {
  name: "InterPro",
  attribution: "Data from InterPro (EMBL-EBI), CC0.",
  terms: "https://www.ebi.ac.uk/about/terms-of-use/",
};
const PDB: Source = {
  name: "RCSB PDB",
  attribution: "Data from the RCSB Protein Data Bank (rcsb.org), CC0.",
  terms: "https://www.rcsb.org/pages/usage-policy",
};
const AFDB: Source = {
  name: "AlphaFold DB",
  attribution: "Predictions from the AlphaFold Protein Structure Database (DeepMind, EMBL-EBI), CC BY 4.0.",
  terms: "https://alphafold.ebi.ac.uk/faq",
};

const UNIPROT_FIELDS = "accession,id,protein_name,gene_names,organism_name,length,cc_function,ft_domain,xref_pdb";
const accession = z.string().regex(/^[A-Z0-9]{6,10}(-\d+)?$/, "a UniProt accession, e.g. P04637");
const pdbId = z.string().regex(/^[0-9][A-Za-z0-9]{3}$/, "a PDB id, e.g. 1TUP");

export default connector({
  name: "proteins",
  version: "0.1.0",
  tools: [
    tool({
      name: "search_proteins",
      description: "Search UniProtKB with its query syntax (e.g. 'gene:TP53 AND organism_id:9606 AND reviewed:true'). Returns accessions, names, genes, organisms and lengths.",
      input: z.object({ query: z.string().min(1).max(500), limit: z.int().min(1).max(50).default(10) }),
      sources: [UNIPROT],
      async run({ query, limit }, { http }) {
        return http.json(
          withQuery("https://rest.uniprot.org/uniprotkb/search", {
            query,
            fields: "accession,id,protein_name,gene_names,organism_name,length,reviewed",
            format: "json",
            size: limit,
          }),
        );
      },
    }),
    tool({
      name: "get_proteins",
      description: "Up to 25 UniProtKB entries by accession: names, genes, function, domains and PDB cross-references.",
      input: z.object({ accessions: z.array(accession).min(1).max(25) }),
      sources: [UNIPROT],
      async run({ accessions }, { http }) {
        return http.json(
          withQuery("https://rest.uniprot.org/uniprotkb/accessions", {
            accessions: accessions.join(","),
            fields: UNIPROT_FIELDS,
            format: "json",
          }),
        );
      },
    }),
    tool({
      name: "get_sequence",
      description: "The amino-acid sequence of one UniProtKB entry, as FASTA.",
      input: z.object({ accession }),
      sources: [UNIPROT],
      async run({ accession: acc }, { http }) {
        return { fasta: await http.text(`https://rest.uniprot.org/uniprotkb/${acc}.fasta`) };
      },
    }),
    tool({
      name: "get_domains",
      description: "InterPro entries (domains, families, sites) matching one UniProtKB protein, with their positions.",
      input: z.object({ accession }),
      sources: [INTERPRO],
      async run({ accession: acc }, { http }) {
        const data = await http.json<{ results?: unknown[]; count?: number }>(
          `https://www.ebi.ac.uk/interpro/api/entry/interpro/protein/uniprot/${acc}?page_size=50`,
        );
        return { count: data.count ?? 0, entries: data.results ?? [] };
      },
    }),
    tool({
      name: "search_structures",
      description: "Full-text search of the RCSB PDB (e.g. 'EGFR kinase erlotinib'); returns PDB ids ranked by relevance.",
      input: z.object({ query: z.string().min(1).max(300), limit: z.int().min(1).max(50).default(10) }),
      sources: [PDB],
      async run({ query, limit }, { http }) {
        const body = {
          query: { type: "terminal", service: "full_text", parameters: { value: query } },
          return_type: "entry",
          request_options: { paginate: { start: 0, rows: limit } },
        };
        const data = await http.json<{ total_count?: number; result_set?: { identifier: string; score: number }[] }>(
          "https://search.rcsb.org/rcsbsearch/v2/query",
          { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
        );
        return { total: data.total_count ?? 0, entries: data.result_set ?? [] };
      },
    }),
    tool({
      name: "get_structures",
      description: "Up to 10 PDB entries: title, method, resolution, release date, polymer entities and citation.",
      input: z.object({ ids: z.array(pdbId).min(1).max(10) }),
      sources: [PDB],
      async run({ ids }, { http }) {
        return Promise.all(
          ids.map(async (id) => {
            const e = await http.json<Record<string, unknown>>(`https://data.rcsb.org/rest/v1/core/entry/${id.toUpperCase()}`);
            return {
              id: id.toUpperCase(),
              title: (e.struct as { title?: string } | undefined)?.title,
              methods: (e.exptl as { method?: string }[] | undefined)?.map((m) => m.method),
              resolution: (e.rcsb_entry_info as { resolution_combined?: number[] } | undefined)?.resolution_combined,
              released: (e.rcsb_accession_info as { initial_release_date?: string } | undefined)?.initial_release_date,
              citation: (e.rcsb_primary_citation as { title?: string; pdbx_database_id_DOI?: string } | undefined) ?? null,
              files: { cif: `https://files.rcsb.org/download/${id.toUpperCase()}.cif` },
            };
          }),
        );
      },
    }),
    tool({
      name: "get_alphafold_model",
      description: "The AlphaFold DB prediction of one UniProtKB protein: model URLs (PDB, mmCIF), mean pLDDT and version.",
      input: z.object({ accession }),
      sources: [AFDB],
      async run({ accession: acc }, { http }) {
        return http.json(`https://alphafold.ebi.ac.uk/api/prediction/${acc}`);
      },
    }),
  ],
});

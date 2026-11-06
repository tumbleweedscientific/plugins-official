/**
 * `genomes`: genes, variants and sequences from Ensembl, NCBI (Gene,
 * ClinVar through E-utilities), gnomAD and the UCSC Genome Browser.
 */
import { z } from "zod";
import { connector, type Source, tool } from "../kit/connector.ts";
import { ncbiSummaries } from "../kit/ncbi.ts";

const ENSEMBL: Source = {
  name: "Ensembl",
  attribution: "Data from Ensembl (EMBL-EBI), Martin et al., Nucleic Acids Res 2023.",
  terms: "https://www.ensembl.org/info/about/legal/disclaimer.html",
};
const NCBI: Source = {
  name: "NCBI",
  attribution: "Data from NCBI (National Library of Medicine) via E-utilities.",
  terms: "https://www.ncbi.nlm.nih.gov/home/about/policies/",
};
const GNOMAD: Source = {
  name: "gnomAD",
  attribution: "Data from the Genome Aggregation Database (gnomAD), Broad Institute; ODC-ODbL / CC0.",
  terms: "https://gnomad.broadinstitute.org/policies",
};
const UCSC: Source = {
  name: "UCSC Genome Browser",
  attribution: "Data from the UCSC Genome Browser (Kent et al., Genome Res 2002).",
  terms: "https://genome.ucsc.edu/conditions.html",
};

const species = z.string().regex(/^[a-z_]+$/).default("homo_sapiens").describe("Ensembl species, e.g. homo_sapiens");

export default connector({
  name: "genomes",
  version: "0.1.0",
  tools: [
    tool({
      name: "search_genes",
      description: "Search NCBI Gene by symbol, name or free text (an exact symbol: 'BRCA1[sym] AND human[orgn]'). Returns gene ids, symbols, descriptions and locations.",
      input: z.object({ query: z.string().min(1).max(500), limit: z.int().min(1).max(50).default(10) }),
      sources: [NCBI],
      async run({ query, limit }, ctx) {
        const { count, items } = await ncbiSummaries(ctx, "gene", query, limit);
        return {
          count,
          genes: items.map((g) => {
            const x = g as Record<string, unknown> & { organism?: { scientificname?: string } };
            return {
              geneId: x.uid,
              symbol: x.name,
              description: x.description,
              organism: x.organism?.scientificname,
              chromosome: x.chromosome,
              location: x.maplocation,
              summary: typeof x.summary === "string" ? x.summary.slice(0, 600) : undefined,
            };
          }),
        };
      },
    }),
    tool({
      name: "get_genes",
      description: "Look up up to 50 genes in Ensembl by Ensembl id (ENSG…) or by symbol, with coordinates, biotype and canonical transcript.",
      input: z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(50), species }),
      sources: [ENSEMBL],
      async run({ ids, species: sp }, { http }) {
        const byId = ids.filter((i) => /^ENS[A-Z]*G\d+/.test(i));
        const bySymbol = ids.filter((i) => !byId.includes(i));
        const headers = { "content-type": "application/json" };
        const found: Record<string, unknown> = {};
        if (byId.length > 0) {
          Object.assign(
            found,
            await http.json("https://rest.ensembl.org/lookup/id", { method: "POST", headers, body: JSON.stringify({ ids: byId }) }),
          );
        }
        if (bySymbol.length > 0) {
          Object.assign(
            found,
            await http.json(`https://rest.ensembl.org/lookup/symbol/${sp}`, {
              method: "POST",
              headers,
              body: JSON.stringify({ symbols: bySymbol }),
            }),
          );
        }
        return { genes: found, missing: ids.filter((i) => found[i] == null) };
      },
    }),
    tool({
      name: "get_variant",
      description: "One variant by rsID from Ensembl: alleles, location, consequence, minor allele frequency and clinical significance.",
      input: z.object({ rsid: z.string().regex(/^rs\d+$/), species }),
      sources: [ENSEMBL],
      async run({ rsid, species: sp }, { http }) {
        return http.json(`https://rest.ensembl.org/variation/${sp}/${rsid}`, {
          headers: { "content-type": "application/json" },
        });
      },
    }),
    tool({
      name: "search_clinvar",
      description: "Search ClinVar (e.g. 'BRCA1[gene] AND pathogenic[clinsig]'): variation ids, titles, clinical significance and review status.",
      input: z.object({ query: z.string().min(1).max(500), limit: z.int().min(1).max(50).default(10) }),
      sources: [NCBI],
      async run({ query, limit }, ctx) {
        const { count, items } = await ncbiSummaries(ctx, "clinvar", query, limit);
        return {
          count,
          variants: items.map((v) => {
            const x = v as Record<string, unknown> & {
              germline_classification?: { description?: string; review_status?: string };
            };
            return {
              variationId: x.uid,
              title: x.title,
              type: x.obj_type,
              significance: x.germline_classification?.description,
              reviewStatus: x.germline_classification?.review_status,
            };
          }),
        };
      },
    }),
    tool({
      name: "get_gnomad_variant",
      description: "Allele frequencies of one variant in gnomAD (id like 1-55051215-G-GA, GRCh38 for gnomad_r4).",
      input: z.object({
        variantId: z.string().regex(/^(\d{1,2}|X|Y|MT?)-\d+-[ACGTN]+-[ACGTN]+$/),
        dataset: z.enum(["gnomad_r4", "gnomad_r3", "gnomad_r2_1"]).default("gnomad_r4"),
      }),
      sources: [GNOMAD],
      async run({ variantId, dataset }, { http }) {
        const query = `query($id:String!,$ds:DatasetId!){variant(variantId:$id,dataset:$ds){variant_id rsids exome{ac an af} genome{ac an af} transcript_consequences{gene_symbol major_consequence hgvsp}}}`;
        const data = await http.json<{ data?: unknown; errors?: { message: string }[] }>("https://gnomad.broadinstitute.org/api", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, variables: { id: variantId, ds: dataset } }),
        });
        if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join("; "));
        return data.data;
      },
    }),
    tool({
      name: "get_sequence",
      description: "DNA sequence of a region (at most 10 000 bases) from the UCSC Genome Browser, e.g. genome hg38, chrom chr17, 0-based start.",
      input: z.object({
        genome: z.string().regex(/^[A-Za-z0-9_]+$/).default("hg38"),
        chrom: z.string().regex(/^[A-Za-z0-9_]+$/),
        start: z.int().min(0),
        end: z.int().min(1),
      }),
      sources: [UCSC],
      async run({ genome, chrom, start, end }, { http }) {
        if (end <= start || end - start > 10_000) throw new Error("the region must be 1–10 000 bases");
        const data = await http.json<{ dna?: string }>(
          `https://api.genome.ucsc.edu/getData/sequence?genome=${genome};chrom=${chrom};start=${start};end=${end}`,
        );
        return { genome, chrom, start, end, dna: data.dna };
      },
    }),
  ],
});

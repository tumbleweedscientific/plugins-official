# Connectors we host

MCP servers on Cloudflare Workers for public research data (ADR 0041 of the
platform), phase 1. One Worker per group of APIs, one endpoint each
(`POST /mcp`, Streamable HTTP, stateless), offered to users through the
`data-*` plugins in `plugins/` (each `withdrawn` until its Worker is live).

| Connector | Tools | Sources (terms) |
| --- | --- | --- |
| `genomes` | search_genes, get_genes, get_variant, search_clinvar, get_gnomad_variant, get_sequence | Ensembl, NCBI Gene/ClinVar (E-utilities), gnomAD, UCSC |
| `proteins` | search_proteins, get_proteins, get_sequence, get_domains, search_structures, get_structures, get_alphafold_model | UniProt (CC BY 4.0), InterPro (CC0), RCSB PDB (CC0), AlphaFold DB (CC BY 4.0) |
| `chemistry` | search_molecules, get_molecules, similar_molecules, search_targets, get_activities, pubchem_compounds | ChEMBL (CC BY-SA 3.0), PubChem |
| `literature` | search_pubmed, get_abstracts, search_europepmc, get_preprint, search_openalex, get_works | PubMed/PMC, Europe PMC, bioRxiv/medRxiv, OpenAlex (CC0) |

Every result ends with its sources' attribution and terms URL. Upstream
answers are cached in the Workers Cache API for a day; calls time out after
20 s and retry once on 429/5xx; results are capped at 60 000 characters. A
caller gets 60 calls a minute (Workers Rate Limiting, keyed by the
platform's `x-tumbleweed-user` header, else the client address). NCBI calls
carry `tool` and `email` (and `api_key` when the `NCBI_API_KEY` secret is
set), per its usage policy. No source here needs a credential; KEGG,
DrugBank and DepMap's restricted sets are not wrapped (their terms).

```bash
npm ci --ignore-scripts
npm test                       # typecheck and the tests with fake upstreams
npm run dev:genomes            # wrangler dev, local only
```

## Deploying (needs the owner's approval)

The Workers run in the account the sandbox gateway uses, routed on
`connectors.tumbleweedscientific.com/<name>/*` (the zone must have that
hostname proxied). Each config sets `CONTACT_EMAIL`, sent to NCBI and
OpenAlex: point it at a real mailbox first.

```bash
npx wrangler deploy --config wrangler.genomes.jsonc
npx wrangler deploy --config wrangler.proteins.jsonc
npx wrangler deploy --config wrangler.chemistry.jsonc
npx wrangler deploy --config wrangler.literature.jsonc
# optional, raises NCBI's limit from 3 to 10 requests a second:
npx wrangler secret put NCBI_API_KEY --config wrangler.genomes.jsonc
npx wrangler secret put NCBI_API_KEY --config wrangler.literature.jsonc
```

Then check `https://connectors.tumbleweedscientific.com/<name>/healthz` and
set the plugin's `status` to `listed` in `.claude-plugin/marketplace.json`.

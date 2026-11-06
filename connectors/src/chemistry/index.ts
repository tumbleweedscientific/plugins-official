/**
 * `chemistry`: bioactive molecules, targets and assay results from ChEMBL,
 * and compounds from PubChem.
 */
import { z } from "zod";
import { connector, type Source, tool } from "../kit/connector.ts";
import { withQuery } from "../kit/upstream.ts";

const CHEMBL: Source = {
  name: "ChEMBL",
  attribution: "Data from ChEMBL (EMBL-EBI), Zdrazil et al., Nucleic Acids Res 2024; CC BY-SA 3.0.",
  terms: "https://www.ebi.ac.uk/about/terms-of-use/",
};
const PUBCHEM: Source = {
  name: "PubChem",
  attribution: "Data from PubChem (NCBI), Kim et al., Nucleic Acids Res 2025.",
  terms: "https://www.ncbi.nlm.nih.gov/home/about/policies/",
};

const API = "https://www.ebi.ac.uk/chembl/api/data";
const chemblId = z.string().regex(/^CHEMBL\d+$/, "a ChEMBL id, e.g. CHEMBL25");
const limit = z.int().min(1).max(100).default(20);

function molecule(m: Record<string, unknown>) {
  const props = (m.molecule_properties ?? {}) as Record<string, unknown>;
  const structures = (m.molecule_structures ?? {}) as Record<string, unknown>;
  return {
    id: m.molecule_chembl_id,
    name: m.pref_name,
    maxPhase: m.max_phase,
    type: m.molecule_type,
    smiles: structures.canonical_smiles,
    inchiKey: structures.standard_inchi_key,
    mw: props.full_mwt,
    alogp: props.alogp,
    hbd: props.hbd,
    hba: props.hba,
    psa: props.psa,
    ro5Violations: props.num_ro5_violations,
  };
}

export default connector({
  name: "chemistry",
  version: "0.1.0",
  tools: [
    tool({
      name: "search_molecules",
      description: "Search ChEMBL molecules by name, synonym or id (e.g. 'imatinib'): ids, structures, phase and drug-likeness properties.",
      input: z.object({ query: z.string().min(1).max(200), limit }),
      sources: [CHEMBL],
      async run({ query, limit: n }, { http }) {
        const data = await http.json<{ molecules?: Record<string, unknown>[]; page_meta?: { total_count?: number } }>(
          withQuery(`${API}/molecule/search.json`, { q: query, limit: n }),
        );
        return { total: data.page_meta?.total_count ?? 0, molecules: (data.molecules ?? []).map(molecule) };
      },
    }),
    tool({
      name: "get_molecules",
      description: "Up to 50 ChEMBL molecules by id.",
      input: z.object({ ids: z.array(chemblId).min(1).max(50) }),
      sources: [CHEMBL],
      async run({ ids }, { http }) {
        const data = await http.json<{ molecules?: Record<string, unknown>[] }>(`${API}/molecule/set/${ids.join(";")}.json`);
        return { molecules: (data.molecules ?? []).map(molecule) };
      },
    }),
    tool({
      name: "similar_molecules",
      description: "ChEMBL molecules similar to a SMILES (Tanimoto similarity, 70–100).",
      input: z.object({ smiles: z.string().min(1).max(500), similarity: z.int().min(70).max(100).default(80), limit }),
      sources: [CHEMBL],
      async run({ smiles, similarity, limit: n }, { http }) {
        const data = await http.json<{ molecules?: (Record<string, unknown> & { similarity?: string })[] }>(
          withQuery(`${API}/similarity/${encodeURIComponent(smiles)}/${similarity}.json`, { limit: n }),
        );
        return { molecules: (data.molecules ?? []).map((m) => ({ ...molecule(m), similarity: m.similarity })) };
      },
    }),
    tool({
      name: "search_targets",
      description: "Search ChEMBL targets by name or gene (e.g. 'EGFR'): target ids, types and organisms.",
      input: z.object({ query: z.string().min(1).max(200), limit }),
      sources: [CHEMBL],
      async run({ query, limit: n }, { http }) {
        const data = await http.json<{ targets?: Record<string, unknown>[] }>(
          withQuery(`${API}/target/search.json`, { q: query, limit: n }),
        );
        return {
          targets: (data.targets ?? []).map((t) => ({
            id: t.target_chembl_id,
            name: t.pref_name,
            type: t.target_type,
            organism: t.organism,
          })),
        };
      },
    }),
    tool({
      name: "get_activities",
      description: "Bioactivity measurements from ChEMBL for a target and/or a molecule, optionally of one type (IC50, Ki, EC50…), best pChEMBL first.",
      input: z
        .object({
          target: chemblId.optional(),
          molecule: chemblId.optional(),
          type: z.string().regex(/^[A-Za-z0-9 %_-]{1,30}$/).optional(),
          limit,
        })
        .refine((a) => a.target !== undefined || a.molecule !== undefined, "give a target or a molecule"),
      sources: [CHEMBL],
      async run({ target, molecule: mol, type, limit: n }, { http }) {
        const data = await http.json<{ activities?: Record<string, unknown>[]; page_meta?: { total_count?: number } }>(
          withQuery(`${API}/activity.json`, {
            target_chembl_id: target,
            molecule_chembl_id: mol,
            standard_type: type,
            pchembl_value__isnull: "false",
            order_by: "-pchembl_value",
            limit: n,
          }),
        );
        return {
          total: data.page_meta?.total_count ?? 0,
          activities: (data.activities ?? []).map((a) => ({
            molecule: a.molecule_chembl_id,
            target: a.target_chembl_id,
            type: a.standard_type,
            relation: a.standard_relation,
            value: a.standard_value,
            units: a.standard_units,
            pchembl: a.pchembl_value,
            assay: a.assay_chembl_id,
            document: a.document_chembl_id,
          })),
        };
      },
    }),
    tool({
      name: "pubchem_compounds",
      description: "PubChem compounds by name or CID: CID, IUPAC name, formula, weight, SMILES, XLogP.",
      input: z.object({
        names: z.array(z.string().min(1).max(200)).max(10).default([]),
        cids: z.array(z.int().positive()).max(50).default([]),
      }),
      sources: [PUBCHEM],
      async run({ names, cids }, { http }) {
        const props = "IUPACName,MolecularFormula,MolecularWeight,SMILES,XLogP,InChIKey";
        const base = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";
        const results: unknown[] = [];
        if (cids.length > 0) {
          results.push(await http.json(`${base}/cid/${cids.join(",")}/property/${props}/JSON`));
        }
        for (const name of names) {
          results.push(await http.json(`${base}/name/${encodeURIComponent(name)}/property/${props}/JSON`));
        }
        return results.flatMap((r) => (r as { PropertyTable?: { Properties?: unknown[] } }).PropertyTable?.Properties ?? []);
      },
    }),
  ],
});

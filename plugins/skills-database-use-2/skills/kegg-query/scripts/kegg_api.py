#!/usr/bin/env python3
"""Standalone KEGG REST API client and parsers (https://rest.kegg.jp)."""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

import requests

KEGG_API_BASE = "https://rest.kegg.jp"


def kegg_find(database: str, query: str, option: Optional[str] = None) -> List[Tuple[str, str]]:
    url = f"{KEGG_API_BASE}/find/{database}/{query}"
    if option:
        url += f"/{option}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    out: List[Tuple[str, str]] = []
    for line in resp.text.strip().splitlines():
        if "\t" in line:
            k, v = line.split("\t", 1)
            out.append((k, v))
    return out


def kegg_get(entry_id: str, option: Optional[str] = None) -> str:
    if ":" not in entry_id:
        if entry_id.startswith("D"):
            entry_id = f"dr:{entry_id}"
        elif entry_id.startswith("C"):
            entry_id = f"cpd:{entry_id}"
        elif entry_id.startswith("H"):
            entry_id = f"ds:{entry_id}"
    url = f"{KEGG_API_BASE}/get/{entry_id}"
    if option:
        url += f"/{option}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def kegg_link(target_db: str, source_db_or_id: str) -> List[Tuple[str, str]]:
    url = f"{KEGG_API_BASE}/link/{target_db}/{source_db_or_id}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    out: List[Tuple[str, str]] = []
    for line in resp.text.strip().splitlines():
        parts = line.split("\t")
        if len(parts) == 2:
            out.append((parts[0], parts[1]))
    return out


def parse_drug_entry(entry: str) -> Dict:
    drug: Dict = {
        "id": "", "names": [], "formula": "", "exact_mass": "", "mol_weight": "",
        "efficacy": [], "diseases": [], "targets": [], "pathways": [], "external_ids": {},
    }
    current = None
    for line in entry.strip().splitlines():
        if not line:
            continue
        if len(line) > 12 and line[12] != " ":
            current = line[:12].strip()
            val = line[12:].strip()
            if current == "ENTRY":
                drug["id"] = val.split()[0]
            elif current == "NAME":
                drug["names"] = [n.strip().rstrip(";") for n in val.split(";") if n.strip()]
            elif current == "FORMULA":
                drug["formula"] = val
            elif current == "EXACT_MASS":
                drug["exact_mass"] = val
            elif current == "MOL_WEIGHT":
                drug["mol_weight"] = val
            elif current == "EFFICACY":
                drug["efficacy"] = [e.strip() for e in val.split(",") if e.strip()]
            elif current == "TARGET":
                drug["targets"].append({"raw": val})
            elif current == "PATHWAY":
                parts = val.split(None, 1)
                if len(parts) == 2:
                    drug["pathways"].append({"id": parts[0], "name": parts[1]})
            elif current == "DBLINKS" and ":" in val:
                k, v = val.split(":", 1)
                drug["external_ids"][k.strip()] = v.strip()
        elif current in ("NAME", "TARGET", "PATHWAY", "EFFICACY"):
            val = line.strip()
            if current == "NAME":
                drug["names"].extend([n.strip().rstrip(";") for n in val.split(";") if n.strip()])
            elif current == "TARGET":
                drug["targets"].append({"raw": val})
            elif current == "PATHWAY":
                parts = val.split(None, 1)
                if len(parts) == 2:
                    drug["pathways"].append({"id": parts[0], "name": parts[1]})
            elif current == "EFFICACY":
                drug["efficacy"].extend([e.strip() for e in val.split(",") if e.strip()])
    return drug


def parse_pathway_entry(entry: str) -> Dict:
    pathway: Dict = {"id": "", "name": "", "description": "", "class": "", "organism": "", "modules": [], "genes": [], "compounds": [], "related_pathways": []}
    current = None
    for line in entry.strip().splitlines():
        if not line:
            continue
        field = line[:12].strip() if len(line) > 12 else ""
        val = line[12:].strip() if len(line) > 12 else line.strip()
        if field:
            current = field
            if field == "ENTRY":
                pathway["id"] = val.split()[0]
            elif field == "NAME":
                pathway["name"] = val
            elif field == "DESCRIPTION":
                pathway["description"] = val
            elif field == "CLASS":
                pathway["class"] = val
            elif field == "ORGANISM":
                pathway["organism"] = val
            elif field == "REL_PATHWAY":
                parts = val.split(None, 1)
                if len(parts) == 2:
                    pathway["related_pathways"].append({"id": parts[0], "name": parts[1]})
        if current == "GENE":
            parts = val.split(None, 1)
            if len(parts) >= 2:
                pathway["genes"].append({"id": parts[0], "raw": val})
        elif current == "COMPOUND":
            parts = val.split(None, 1)
            if len(parts) == 2:
                pathway["compounds"].append({"id": parts[0], "name": parts[1]})
        elif current == "MODULE":
            parts = val.split(None, 1)
            if len(parts) == 2:
                pathway["modules"].append({"id": parts[0], "description": parts[1]})
    return pathway


def parse_disease_entry(entry: str) -> Dict:
    disease: Dict = {"id": "", "name": "", "description": "", "category": "", "genes": [], "drugs": [], "pathways": []}
    current = None
    for line in entry.strip().splitlines():
        if not line:
            continue
        field = line[:12].strip() if len(line) > 12 else ""
        val = line[12:].strip() if len(line) > 12 else line.strip()
        if field:
            current = field
            if field == "ENTRY":
                disease["id"] = val.split()[0]
            elif field == "NAME":
                disease["name"] = val.rstrip(";")
            elif field == "DESCRIPTION":
                disease["description"] = val
            elif field == "CATEGORY":
                disease["category"] = val
            elif field == "PATHWAY":
                parts = val.split(None, 1)
                if len(parts) == 2:
                    disease["pathways"].append({"id": parts[0], "name": parts[1]})
        if current == "GENE":
            m = re.search(r"([A-Za-z0-9_-]+)", val)
            disease["genes"].append({"symbol": m.group(1) if m else val, "raw": val})
        elif current == "DRUG":
            m = re.search(r"\[DR:(D\d+)\]", val)
            disease["drugs"].append({"id": m.group(1) if m else "", "raw": val})
    return disease

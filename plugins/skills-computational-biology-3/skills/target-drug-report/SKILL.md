---
name: target-drug-report
description: Generate comprehensive drug development progress reports for disease therapeutic targets. Use when user asks about target drug pipeline, clinical trials, or research progress. Triggers on phrases like "target report", "drug development progress", "clinical trial summary", "靶点报告", "药物研发进展", "竞品分析", "专利分析".
metadata:
  tumbleweed:
    domains:
    - pharmacology
    - clinical
    tags:
    - target-drug-report
    - computational-biology
    maturity: stable
    citations: []
    starterPrompts:
    - 'Use target-drug-report: Generate comprehensive drug development progress reports for disease therapeutic targets.'
    requires:
      environment: sandbox
      gpu: false
      tools: []
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
      image: bioinfo
      resourceClass: standard
      network: []
    inputs:
    - pdf
    - html
    outputs:
    - report
    - pdf
    - html
    title: Target Drug Report
license: Apache-2.0
---

# Target Drug Development Report (Enhanced)

## Overview

Generate beautiful, comprehensive reports on drug development progress for therapeutic targets.

**Features:**
- 7 analysis sections with visualizations
- HTML and Markdown output formats
- Responsive design for all devices
- Print-friendly for PDF export

## When to Use

- User asks about a specific target's drug development status
- Need to summarize clinical trial progress for a target
- Researching competitive landscape for a therapeutic target
- Understanding drug pipeline and market opportunities

## Workflow

Step 1 — gather evidence with the agent's own tools (not Python): `web_search` / `web_fetch`
for news, pipeline and market context; the `clinical-trials-database` skill for trials; the
`opentargets-database` and `chembl-database` skills for target–drug links; and the
`pubmed-database` skill for papers. Keep every source URL for the report.

Step 2 — render the report with the helper in `examples/basic_example.py`:

```python
target_name = "CGRP"
report = generate_target_report(
    target=target_name,
    output_format="html"  # or "markdown"
)
```

## Report Sections

| Section | Description | Key Content |
|---------|-------------|-------------|
| 🎯 靶点概况 | Target overview | Protein function, diseases |
| 💊 已上市药物 | Approved drugs | Name, company, indication |
| 🏥 临床管线 | Clinical pipeline | Phase distribution, drugs |
| 📚 研究热点 | Research trends | Publications, directions |
| 📜 专利布局 | Patent landscape | Trends, applicants |
| 📊 市场分析 | Market analysis | Size, competition |
| 🔮 投资展望 | Investment outlook | Opportunities, risks |

## Output Formats

### HTML (推荐)
- Modern responsive design
- Interactive charts and progress bars
- Color-coded status tags
- Print to PDF support

### Markdown
- Plain text format
- Table-based layout
- Version control friendly
- Easy to edit

## Usage

```python
# Generate HTML report
report = generate_target_report("EGFR", output_format="html")

# Generate Markdown report
report = generate_target_report("KRAS", output_format="markdown")

# Save to file
report = generate_target_report(
    target="BCL-2",
    output_format="html",
    output_path="report.html"
)
```

## Error Handling

When web search is unavailable, uses built-in knowledge for common targets:
- EGFR, KRAS, BCL-2, ALK, BRAF, HER2 (Oncology)
- PD-1, CTLA-4 (Immunology)
- CGRP, JAK, BTK (Other)

## Files

```
target-drug-report/
├── SKILL.md                    # This file
├── examples/
│   └── basic_example.py        # Report generator script
└── references/
    ├── html_template.py        # HTML template
    └── data_sources.md         # Data source reference
```

## Limitations

- Requires network for real-time data
- Built-in knowledge for ~20 common targets
- Patent data may be incomplete

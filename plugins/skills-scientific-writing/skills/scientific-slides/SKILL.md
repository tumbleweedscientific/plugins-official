---
name: scientific-slides
title: Scientific Presentation & Slide Deck Builder
description: Designs, compiles, validates, and visually inspects scientific talk decks (conference talks, seminars, thesis defenses, journal clubs) using LaTeX Beamer or Matplotlib/Pillow PDF pipelines with timing budgets and literature-backed citations.
license: MIT
metadata:
  tumbleweed:
    domains:
      - writing
      - visualization
      - literature
    tags:
      - slides
      - presentations
      - beamer
      - talks
    maturity: stable
    citations: []
    starterPrompts:
      - Use scientific-slides to structure and build a 15-minute conference Beamer deck and validate the rendered slides.
    requires:
      environment: sandbox
      gpu: false
      tools:
        - python
        - pillow
        - pypdf
        - pymupdf
        - texlive
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      network: []
      longRunning: false
    inputs:
      - report
      - tex
      - png
      - pdf
      - json
    outputs:
      - pdf
      - tex
      - png
      - report
---

# Scientific Presentation & Slide Deck Builder

Design and build clear, visually disciplined scientific presentations tailored to talk duration (`assets/timing_guidelines.md`), audience (`references/talk_types_guide.md`), narrative structure (`references/presentation_structure.md`), and visual readability (`references/slide_design_principles.md`, `references/data_visualization_slides.md`).

## Deck Generation Pipelines (Sandbox)

Choose the right format for the presentation:

1. **LaTeX Beamer (`.tex` -> `.pdf`)** *(default for academic conferences, defenses, equation-heavy talks)*:
   - Author clean 16:9 Beamer slides (`\documentclass[aspectratio=169]{beamer}`), embed high-DPI figures (`\includegraphics`), keep 1 clear takeaway per slide, and include compact verified citations in slide footers.
   - Ground literature citations with `literature_search` / `literature_read` before writing references onto slides.
   - Compile with `pdflatex -interaction=nonstopmode` (or `latexmk -pdf`).
2. **Figure-Driven Slide Images -> PDF (`scripts/slides_to_pdf.py`)**:
   - When rendering graphical/storyboard slides programmatically with Matplotlib or Pillow (`.png`), assemble slides cleanly into a single PDF:
     ```bash
     python scripts/slides_to_pdf.py slides/*.png -o /workspace/presentation.pdf
     ```

## Validation & Visual Inspection (Mandatory)

1. **Structural & Duration Validation**:
   ```bash
   python scripts/validate_presentation.py /workspace/presentation.pdf --duration 15
   ```
   (Checks page count against `assets/timing_guidelines.md`, file size, slide aspect ratio, and Beamer compilation when given `.tex`.)
2. **Visual Layout Inspection (`references/visual_review_workflow.md`)**:
   - Render slides to images and inspect them directly for text clipping, overflow, overlapping equations/labels, or weak contrast:
     ```bash
     python scripts/pdf_to_images.py /workspace/presentation.pdf review/slide --dpi 150
     ```
   - Alternatively inspect targeted PDF pages via `read_document(..., as: "image", pages: "1-4")`. Fix any overflow in source and recompile before delivering.

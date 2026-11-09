"""
Helpers of the pdf-explore skill. Load them into the notebook's Python
kernel with

    exec(open("/opt/skills/pdf-explore/kernel.py").read())

Surface (all ``pdf_``-prefixed, as they share the kernel's ``__main__``):
    pdf_pages(path, ...)        — parse once → [{page, text, n_chars, image_path?}]
    pdf_outline(path)           — table of contents (embedded, else heading heuristics)
    pdf_search(path, query, k)  — rank pages by the query's terms (no model call)
    pdf_grep(path, pattern)     — every regex match with page and context
    pdf_crop(path, page, box)   — high-DPI crop of a page region, to `read`
    pdf_write_pages(path, pages, out) — pages as one text file, to `read`

Modified by Tumbleweed Scientific (2026-10-29) from Claude Science's
pdf-explore skill (Apache-2.0). The original swept pages with parallel model
calls (pdf_scan / pdf_map / pdf_extract, and an outline fallback); no model
is callable from code here, so those are replaced by lexical search, regex
and heading heuristics, and reading stays with the agent. pdf_pages is kept
nearly as it was (install hints and the cache directory changed). See
MODIFICATIONS.md at the plugin root.
"""

import hashlib
import math
import os
import re


PDF_PAGE_CACHE = {}
"""(abs_path, mtime, mode, dpi) → [{page, text, n_chars, image_path?}].
Module-level so repeated calls on the same file skip re-parsing."""

PDF_AUTO_IMAGE_CHARS_THRESHOLD = 80
"""Mean characters per page below which ``mode="auto"`` treats the PDF as
scanned and renders images instead."""


def pdf_resolve(path):
    """A local path (``~`` expanded)."""
    if not isinstance(path, str) or not path:
        raise TypeError("pdf_resolve: path must be a non-empty str")
    return os.path.expanduser(path)


def pdf_pages(path, mode="auto", pages=None, dpi=100, cache=True):
    """Parse a PDF into a per-page list. Cached on (path, mtime, mode, dpi).

    Returns ``[{"page": 1-indexed int, "text": str, "n_chars": int,
    "image_path": str|None}, ...]``.

    ``mode``:
        "auto"  — (default) try text extraction first; if the mean page
                  has fewer than :data:`PDF_AUTO_IMAGE_CHARS_THRESHOLD`
                  characters (i.e. a scanned/image-only PDF), switch to
                  image mode. No extra cost on text-layer PDFs.
        "text"  — text extraction only (cheap; misses figures/scans)
        "image" — render each page to
                  ``./.cache/pdf-explore/{sha8}-{mtime}/dpi{N}/p{NNN}.png``
                  at ``dpi`` (default 100; ~1200×1600 for letter-size)
        "both"  — text + image

    ``pages``: optional 1-indexed list/range to restrict to (e.g. ``[3,4,5]``
    or ``range(1,11)``). With ``cache=True`` only a FULL read populates the
    in-memory cache; a later subset read is served from it for free, but a
    cold subset read re-parses each time (page renders are still reused on
    disk via the ``.cache/pdf-explore`` dir).

    Requires ``pypdfium2`` (``pip install pypdfium2 pillow``; permissively
    licensed). Falls back to ``pymupdf`` if the user installed it, then to
    ``pypdf`` for text-only mode. Raises ``ImportError`` saying what to
    install if none is available.
    """
    path = pdf_resolve(path)
    if not os.path.exists(path):
        raise FileNotFoundError(f"pdf_pages: {path!r} not found")
    if mode not in ("text", "image", "both", "auto"):
        raise ValueError(
            f"pdf_pages: mode must be 'text'|'image'|'both'|'auto', got {mode!r}"
        )



    if pages is not None and not hasattr(pages, "__len__"):
        pages = list(pages)
    if mode == "auto":





        txt = pdf_pages(path, mode="text", pages=pages, dpi=dpi, cache=cache)
        if not txt:
            return txt
        mean_chars = sum(p["n_chars"] for p in txt) / len(txt)
        if mean_chars < PDF_AUTO_IMAGE_CHARS_THRESHOLD:
            return pdf_pages(path, mode="image", pages=pages, dpi=dpi,
                             cache=cache)
        return txt

    abspath = os.path.abspath(path)
    mtime = os.stat(abspath).st_mtime_ns
    key = (abspath, mtime, mode, int(dpi))
    want = None if pages is None else set(int(p) for p in pages)
    if cache and key in PDF_PAGE_CACHE:
        cached = PDF_PAGE_CACHE[key]
        if want is None:
            return [dict(p) for p in cached]
        hit = [dict(p) for p in cached if p["page"] in want]
        if len(hit) == len(want):
            return hit

    render = mode in ("image", "both")
    need_text = mode in ("text", "both")
    out = []
    img_dir = None
    if render:
        sha8 = hashlib.sha1(abspath.encode()).hexdigest()[:8]







        img_dir = os.path.join(
            "/workspace" if os.path.isdir("/workspace") else os.getcwd(),
            ".cache", "pdf-explore",
            f"{sha8}-{mtime}", f"dpi{int(dpi)}",
        )
        os.makedirs(img_dir, exist_ok=True)

    try:
        import pypdfium2 as pdfium
    except ImportError:
        pdfium = None






    if pdfium is not None and render:
        try:
            import PIL.Image
        except ImportError:
            pdfium = None
    fitz = None
    if pdfium is None:
        try:
            import fitz
        except ImportError:
            pass

    if pdfium is not None:
        try:
            doc = pdfium.PdfDocument(abspath)
        except Exception as e:
            if "password" in str(e).lower():
                raise ValueError(
                    f"pdf_pages: {path!r} is password-protected. Decrypt "
                    f"it first (e.g. `qpdf --decrypt --password=... in out` "
                    f"or pypdfium2.PdfDocument(path, password=pw))."
                ) from e
            raise
        try:
            total = len(doc)
            idxs = (
                range(total) if want is None
                else sorted(i - 1 for i in want if 1 <= i <= total)
            )
            for i in idxs:
                pg = doc[i]
                txt = ""
                if need_text:
                    tp = pg.get_textpage()


                    txt = tp.get_text_bounded().replace("\r\n", "\n")
                    tp.close()
                ip = None
                if render:
                    ip = os.path.join(img_dir, f"p{i + 1:03d}.png")
                    if not (cache and os.path.exists(ip)):

                        bmp = pg.render(scale=float(dpi) / 72.0)
                        bmp.to_pil().save(ip)
                out.append({
                    "page": i + 1,
                    "text": txt,
                    "n_chars": len(txt),
                    "image_path": ip,
                })
        finally:
            doc.close()
    elif fitz is not None:
        doc = fitz.open(abspath)
        try:
            if doc.needs_pass:
                raise ValueError(
                    f"pdf_pages: {path!r} is password-protected. Decrypt "
                    f"it first (e.g. `qpdf --decrypt --password=... in out` "
                    f"or `fitz.open(path).authenticate(pw)`)."
                )
            total = doc.page_count
            idxs = (
                range(total) if want is None
                else sorted(i - 1 for i in want if 1 <= i <= total)
            )
            for i in idxs:
                pg = doc.load_page(i)
                txt = pg.get_text("text") if need_text else ""
                ip = None
                if render:
                    ip = os.path.join(img_dir, f"p{i + 1:03d}.png")
                    if not (cache and os.path.exists(ip)):

                        zoom = float(dpi) / 72.0
                        pix = pg.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
                        pix.save(ip)
                out.append({
                    "page": i + 1,
                    "text": txt,
                    "n_chars": len(txt),
                    "image_path": ip,
                })
        finally:
            doc.close()
    else:
        if render:
            raise ImportError(
                "pdf_pages(mode='image'|'both') requires pypdfium2 and "
                "pillow: run `pip install pypdfium2 pillow` in bash and re-run."
            )
        try:
            from pypdf import PdfReader
        except ImportError as e:
            raise ImportError(
                "pdf_pages requires pypdfium2 or pypdf: run "
                "`pip install pypdfium2 pillow` in bash and re-run."
            ) from e
        reader = PdfReader(abspath)
        total = len(reader.pages)
        idxs = (
            range(total) if want is None
            else sorted(i - 1 for i in want if 1 <= i <= total)
        )
        for i in idxs:
            txt = reader.pages[i].extract_text() or ""
            out.append({
                "page": i + 1,
                "text": txt,
                "n_chars": len(txt),
                "image_path": None,
            })

    if cache and want is None:
        PDF_PAGE_CACHE[key] = [dict(p) for p in out]
    return out


def pdf_outline(path):
    """Table of contents ``[{"page", "heading", "level"}]`` in page order.

    The PDF's embedded outline when it has one (most LaTeX-built papers do);
    otherwise headings guessed from the text layer: numbered headings
    ("2.1 Methods"), and short title-like lines such as "Abstract",
    "Results" or "DISCUSSION". A guessed outline is a starting point, not
    ground truth — check it against the pages."""
    abspath = os.path.abspath(pdf_resolve(path))
    toc = []
    try:
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(abspath)
        try:
            for bm in doc.get_toc():
                dest = bm.get_dest()
                idx = dest.get_index() if dest else None
                if idx is not None:
                    toc.append({"page": idx + 1, "heading": bm.get_title().strip(),
                                "level": bm.level + 1})
        finally:
            doc.close()
    except Exception:
        try:
            import fitz
            with fitz.open(abspath) as d:
                toc = [{"page": p, "heading": t.strip(), "level": lv}
                       for lv, t, p in d.get_toc(simple=True) if p > 0]
        except Exception:
            toc = []
    if toc:
        return toc
    common = {"abstract", "introduction", "background", "methods", "materials and methods",
              "results", "discussion", "conclusion", "conclusions", "references",
              "acknowledgements", "acknowledgments", "supplementary information",
              "data availability", "limitations", "appendix"}
    numbered = re.compile(r"^(\d+(?:\.\d+){0,3})\.?\s+([A-Z][^\n]{2,80})$")
    out = []
    for p in pdf_pages(abspath, mode="text"):
        for raw in p["text"].split("\n"):
            line = raw.strip()
            if not line or len(line) > 90:
                continue
            m = numbered.match(line)
            if m and not line.endswith((".", ",", ";")):
                out.append({"page": p["page"], "heading": line,
                            "level": m.group(1).count(".") + 1})
            elif line.lower().rstrip(":") in common:
                out.append({"page": p["page"], "heading": line.rstrip(":"), "level": 1})
    return out


def pdf_search(path, query, top_k=5, pages=None):
    """Rank pages by the query's terms (BM25 over the text layer; no model
    call). Returns ``{"hits": [{page, score, snippet, text}], "n_scanned"}``.

    Lexical, not semantic: phrase the query with the words the document
    would use, and try synonyms ("limitations", "caveats", "weaknesses")
    when the first ranking looks off."""
    docs = pdf_pages(path, mode="text", pages=pages)
    terms = [t for t in re.findall(r"[a-z0-9]+", query.lower()) if len(t) > 1]
    if not docs or not terms:
        return {"hits": [], "n_scanned": len(docs)}
    toks = [re.findall(r"[a-z0-9]+", d["text"].lower()) for d in docs]
    avg = sum(len(t) for t in toks) / len(toks) or 1.0
    n = len(docs)
    df = {t: sum(1 for d in toks if t in set(d)) for t in set(terms)}
    k1, b = 1.5, 0.75
    scored = []
    for d, words in zip(docs, toks):
        if not words:
            continue
        counts = {}
        for w in words:
            if w in df:
                counts[w] = counts.get(w, 0) + 1
        s = 0.0
        for t in terms:
            f = counts.get(t, 0)
            if f:
                idf = math.log(1 + (n - df[t] + 0.5) / (df[t] + 0.5))
                s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * len(words) / avg))
        if s > 0:
            low = d["text"].lower()
            at = min((low.find(t) for t in terms if low.find(t) >= 0), default=0)
            snippet = " ".join(d["text"][max(0, at - 120): at + 200].split())
            scored.append({"page": d["page"], "score": round(s, 3),
                           "snippet": snippet, "text": d["text"]})
    scored.sort(key=lambda h: -h["score"])
    return {"hits": scored[:top_k], "n_scanned": n}


def pdf_grep(path, pattern, flags=re.IGNORECASE, context=80, pages=None):
    """Every match of the regex ``pattern`` across the document:
    ``[{page, match, context}]``. The exhaustive-listing tool: accession
    numbers (``r"GSE\\d{4,}"``), dataset names, figure labels
    (``r"Fig(?:ure)?\\.?\\s*\\d+[a-z]?"``), DOIs."""
    rx = re.compile(pattern, flags)
    out = []
    for p in pdf_pages(path, mode="text", pages=pages):
        t = p["text"]
        for m in rx.finditer(t):
            a, z = max(0, m.start() - context), min(len(t), m.end() + context)
            out.append({"page": p["page"], "match": m.group(0),
                        "context": " ".join(t[a:z].split())})
    return out


def pdf_write_pages(path, pages, out_path):
    """Write the text of ``pages`` to ``out_path`` (one block per page) and
    return its size, so several sections can be `read` at once."""
    with open(out_path, "w", encoding="utf-8") as f:
        for p in pdf_pages(path, pages=pages, mode="text"):
            f.write(f"\n── page {p['page']} ──\n{p['text']}")
    return os.path.getsize(out_path)


def pdf_crop(path, page, box=None, dpi=200, out_path=None):
    """Render ``page`` at ``dpi`` and save ``box`` = (x0, y0, x1, y1), in
    pixels of that render (origin top-left), or the whole page when ``box``
    is None. Returns the PNG path to look at with `read`. Crop one panel at
    a time: a whole page is too small to read figure labels from."""
    from PIL import Image
    p = pdf_pages(path, mode="image", pages=[int(page)], dpi=dpi)[0]
    stem = os.path.splitext(os.path.basename(pdf_resolve(path)))[0]
    tag = "full" if box is None else "-".join(str(int(v)) for v in box)
    out_path = out_path or os.path.join(
        os.path.dirname(p["image_path"]), f"{stem}_p{int(page)}_{tag}.png")
    with Image.open(p["image_path"]) as im:
        (im if box is None else im.crop(tuple(int(v) for v in box))).save(out_path)
    return out_path

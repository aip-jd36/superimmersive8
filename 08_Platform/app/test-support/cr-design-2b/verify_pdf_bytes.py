"""
CR-DESIGN-2B-R1 - TEST ONLY. Verifies the Institutional Trust review PDFs from their BYTES, as a reader sees them (PyMuPDF / MuPDF),
not from the document model or a separate @react-pdf layout pass (the CR-DESIGN-2B checks read the layout tree, which is why a
footer placed ~213,000 pt below the page passed them).

Usage: python -I verify_pdf_bytes.py <expect.json> [<expect.json> ...]   (prints one JSON report to stdout)

Each <expect.json> is written by render-review.tsx next to its PDF:
  { pdf, header, stamp, page_label, strings: [printed strings in print order], probes: [strings to search for],
    content_top, content_bottom, content_left, content_right, header_bottom, footer_top, background: {warm, reading} }

Checks, per page of the PDF bytes:
  chrome       the complete running header and the complete stamp are extractable on the page, and lie in their reserved bands;
  page_label   "Page N of M" (the approved label) is extractable, correct, and lies in the footer band;
  bounds       every non-chrome glyph lies inside the content region (top/bottom padding) and on the page;
  overlap      no two text lines of the content overlap each other;
  obscured     no filled shape drawn after a text line covers it;
  raster       rendered at 2x, the bands between the running header and the content, and between the content and the footer,
               hold only the page background (catches backgrounds, rules and glyphs intruding into the reserved regions);
and per document:
  text         every printed string is extractable, in print order, character for character (whitespace aside);
  search       every probe string (curly apostrophes, CJK and other international text) is found by PDF text search.

Limitations (also in the implementation report): geometric checks see text lines and filled shapes, not their visual quality;
a raster check of the reserved bands cannot judge whether the design looks right, whether whitespace is pleasing, or how a page
prints on paper; overlap is judged on glyph boxes (font ascent/descent), so tightly set lines that only touch are tolerated.
"""
import json
import re
import sys

import fitz  # PyMuPDF

WS = re.compile(r"\s+")
TOL = 0.75  # pt


def norm(s):
    return WS.sub("", s)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def line_boxes(page):
    """Each text line of the page: its text and box."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            text = "".join(s["text"] for s in l["spans"])
            if text.strip():
                out.append((text, fitz.Rect(l["bbox"])))
    return out


def inter_area(a, b):
    r = fitz.Rect(a) & fitz.Rect(b)
    return 0.0 if r.is_empty else r.width * r.height


def check(expect):
    doc = fitz.open(expect["pdf"])
    n = doc.page_count
    rep = {"pdf": expect["pdf"], "pages": n, "failures": []}
    fail = rep["failures"].append
    header, stamp = norm(expect["header"]), norm(expect["stamp"])
    ct, cb = expect["content_top"], expect["content_bottom"]
    hb, ft = expect["header_bottom"], expect["footer_top"]
    full = []
    for i, page in enumerate(doc):
        no = i + 1
        txt = page.get_text()
        flat = norm(txt)
        if header not in flat:
            fail(f"p{no}: running header not extractable")
        if stamp not in flat:
            fail(f"p{no}: running stamp not extractable")
        label = expect["page_label"].replace("{page}", str(no)).replace("{pages}", str(n))
        hits = page.search_for(label)
        if not hits:
            fail(f"p{no}: page label '{label}' not found")
        elif not all(h.y0 >= ft - TOL for h in hits):
            fail(f"p{no}: page label outside the footer band")
        # The page's body text in print order: the page minus its chrome (a paragraph that continues onto the next page then reads on).
        body_text = flat
        for chrome in (header, stamp, norm(label)):
            body_text = body_text.replace(chrome, "", 1)
        full.append(body_text)
        others = [f"Page {k} of {n}" for k in range(1, n + 1) if k != no]
        if any(norm(o) in flat for o in others):
            fail(f"p{no}: wrong page number printed")
        # Bounds and overlap: chrome lines are those wholly inside the reserved bands.
        lines = line_boxes(page)
        body = []
        for text, r in lines:
            if r.y1 <= hb + TOL or r.y0 >= ft - TOL:
                continue  # chrome band
            if r.x0 < -TOL or r.x1 > page.rect.width + TOL or r.y0 < -TOL or r.y1 > page.rect.height + TOL:
                fail(f"p{no}: text off the page: {text[:50]!r}")
            if r.y0 < ct - TOL or r.y1 > cb + TOL:
                fail(f"p{no}: text outside the content region ({r.y0:.1f}-{r.y1:.1f}): {text[:50]!r}")
            body.append((text, r))
        for a in range(len(body)):
            for b in range(a + 1, len(body)):
                ra, rb = body[a][1], body[b][1]
                ov = inter_area(ra, rb)
                if ov > 0:
                    v = min(ra.y1, rb.y1) - max(ra.y0, rb.y0)
                    h = min(ra.x1, rb.x1) - max(ra.x0, rb.x0)
                    if v > 0.35 * min(ra.height, rb.height) and h > 1.0:
                        fail(f"p{no}: overlapping text: {body[a][0][:40]!r} / {body[b][0][:40]!r}")
        # Obscured: a filled shape drawn after a text span and covering its centre.
        trace = page.get_texttrace()
        fills = [d for d in page.get_drawings() if d.get("fill") is not None and d.get("seqno") is not None]
        for sp in trace:
            r = fitz.Rect(sp["bbox"])
            if r.is_empty:
                continue
            c = fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
            for d in fills:
                if d["seqno"] > sp["seqno"] and fitz.Rect(d["rect"]).contains(c):
                    chars = "".join(chr(ch[0]) for ch in sp["chars"])[:40]
                    fail(f"p{no}: text covered by a later shape: {chars!r}")
                    break
        # Raster: reserved bands hold only the page background.
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        corner = pix.pixel(4, 4)
        grounds = [hex_rgb(v) for v in expect["background"].values()]
        bg = min(grounds, key=lambda g: max(abs(corner[k] - g[k]) for k in range(3)))
        if max(abs(corner[k] - bg[k]) for k in range(3)) > 3:
            fail(f"p{no}: page ground is not a configured background")
        for name, y0, y1 in (("header band", hb + 2, ct - 1), ("footer band", cb + 1, ft - 2)):
            bad = 0
            for y in range(int(y0 * 2), int(y1 * 2)):
                for x in range(int(expect["content_left"] * 2), int(expect["content_right"] * 2), 3):
                    p = pix.pixel(x, y)
                    if max(abs(p[k] - bg[k]) for k in range(3)) > 6:
                        bad += 1
            if bad:
                fail(f"p{no}: {bad} non-background pixels in the {name}")
    whole = "".join(full)
    pos = 0
    missing = []
    for s in expect["strings"]:
        k = whole.find(norm(s), pos)
        if k < 0:
            missing.append(s[:80])
        else:
            pos = k + len(norm(s))
    if missing:
        fail(f"text: {len(missing)} printed strings not extractable in order, first: {missing[0]!r}")
    rep["strings_checked"] = len(expect["strings"])
    unsearchable = []
    for probe in expect["probes"]:
        if not any(p.search_for(probe) for p in doc):
            unsearchable.append(probe)
    if unsearchable:
        fail(f"search: {len(unsearchable)} probe strings not found, first: {unsearchable[0]!r}")
    rep["probes_checked"] = len(expect["probes"])
    rep["ok"] = not rep["failures"]
    return rep


if __name__ == "__main__":
    reports = [check(json.load(open(p, encoding="utf-8"))) for p in sys.argv[1:]]
    sys.stdout.write(json.dumps(reports))

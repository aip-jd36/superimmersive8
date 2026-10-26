"""PRODUCT-A-MVP-SPIKE-1A: render synthetic receipt fixtures from receipt-fixtures.json.

Offline developer tool. Not part of the app runtime and not installed by npm.
Requires Python 3.10+ with PyMuPDF (fitz) and Pillow.

    python -I generate_receipt_fixtures.py [--out DIR]

Every document is first laid out as HTML on a PDF page (so PDFs keep a real
text layer), then optionally rasterized and degraded to simulate screenshots
and phone photos. Randomness is seeded per document. Output:

    <out>/<id>.<pdf|png|jpg>
    <out>/manifest.json   sha256, size, media type, pixel size and the
                          document's own text (used by the scorer to check
                          that evidence excerpts really appear in it)

Byte-identical output is only expected with the same PyMuPDF/Pillow versions;
the manifest records both so a changed fixture is detectable.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
import random
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

GENERATOR_VERSION = "receipt-fixture-generator-v1"
HERE = Path(__file__).resolve().parent
SPEC = HERE / "receipt-fixtures.json"

A4 = (595, 842)
SCREEN = (960, 600)

BASE_CSS = """
body { font-family: sans-serif; color: #1d1d1f; font-size: 11pt; }
h1 { font-size: 20pt; margin: 0 0 4pt 0; }
h2 { font-size: 14pt; margin: 10pt 0 4pt 0; }
.muted { color: #6b6b70; font-size: 9pt; }
.marker { color: #9a9aa0; font-size: 7pt; }
table { border-collapse: collapse; width: 100%; }
td, th { border-bottom: 1px solid #d0d0d6; padding: 5pt 4pt; text-align: left; }
th { font-size: 9pt; color: #6b6b70; }
.right { text-align: right; }
.box { border: 1px solid #c8c8d0; padding: 8pt; margin: 8pt 0; }
.bar { background-color: #20232a; color: #ffffff; padding: 8pt; font-size: 12pt; }
.hidden { color: #ffffff; font-size: 5pt; }
.obscured { color: #e6e6e6; }
"""


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def resolve_content(doc: dict, by_id: dict) -> dict:
    if "content_from" in doc:
        content = dict(resolve_content(by_id[doc["content_from"]], by_id))
    else:
        content = dict(doc.get("content", {}))
    content.update(doc.get("content_overrides", {}))
    return content


def invoice_html(c: dict, marker: str) -> str:
    parts = []
    if not c.get("hide_issuer") and c.get("issuer"):
        parts.append(f"<h1>{esc(c['issuer'])}</h1>")
        if c.get("issuer_address"):
            parts.append(f"<p class='muted'>{esc(c['issuer_address'])}</p>")
    parts.append(f"<h2>{esc(c.get('title', 'INVOICE'))}</h2>")
    meta = [f"Number: {esc(c.get('number', ''))}"]
    if c.get("date_obscured"):
        meta.append("Date: <span class='obscured'>&#9608;&#9608;&#9608;&#9608;&#9608;&#9608;&#9608;&#9608;</span>")
    elif c.get("date_text"):
        meta.append(f"Date: {esc(c['date_text'])}")
    parts.append("<p>" + "<br/>".join(meta) + "</p>")
    if c.get("bill_to"):
        parts.append("<p class='muted'>Bill to</p><p>" + "<br/>".join(esc(x) for x in c["bill_to"]) + "</p>")
    rows = "".join(
        f"<tr><td>{esc(i['desc'])}</td><td class='right'>{esc(i['amount'])}</td></tr>" for i in c.get("items", [])
    )
    parts.append(f"<table><tr><th>Description</th><th class='right'>Amount</th></tr>{rows}</table>")
    if c.get("period_text"):
        parts.append(f"<p>{esc(c.get('period_label', 'Service period'))}: {esc(c['period_text'])}</p>")
    if c.get("total"):
        parts.append(f"<p><b>Total: {esc(c['total'])}</b></p>")
    if c.get("payment_line"):
        parts.append(f"<p class='muted'>{esc(c['payment_line'])}</p>")
    for n in c.get("notes", []):
        parts.append(f"<div class='box'>{esc(n)}</div>")
    if c.get("hidden_text"):
        parts.append(f"<p class='hidden'>{esc(c['hidden_text'])}</p>")
    parts.append(f"<p class='marker'>{esc(marker)}</p>")
    return "".join(parts)


def web_billing_html(c: dict, marker: str) -> str:
    parts = [f"<div class='bar'><b>{esc(c['app_name'])}</b> &#160;&#160; Account &#8250; {esc(c['page_title'])}</div>"]
    parts.append(f"<h2>{esc(c['page_title'])}</h2>")
    if c.get("current_plan"):
        parts.append(f"<div class='box'>Current plan: <b>{esc(c['current_plan'])}</b></div>")
    for n in c.get("notes", []):
        parts.append(f"<p>{esc(n)}</p>")
    hide_date = c.get("hide_date_column", False)
    head = ("" if hide_date else "<th>Date</th>") + "<th>Description</th><th>Amount</th><th>Status</th>"
    rows = ""
    for r in c.get("rows", []):
        date_cell = "" if hide_date else f"<td>{esc(r.get('date', ''))}</td>"
        rows += f"<tr>{date_cell}<td>{esc(r['desc'])}</td><td>{esc(r['amount'])}</td><td>{esc(r['status'])}</td></tr>"
    parts.append(f"<table><tr>{head}</tr>{rows}</table>")
    parts.append(f"<p class='marker'>{esc(marker)}</p>")
    return "".join(parts)


def email_html(c: dict, marker: str) -> str:
    parts = ["<div class='bar'>Inbox</div>"]
    parts.append(f"<p class='muted'>From: {esc(c['from'])}<br/>To: {esc(c['to'])}<br/>Date: {esc(c['date_text'])}</p>")
    parts.append(f"<h2>{esc(c['subject'])}</h2>")
    parts.append("<p>" + "<br/>".join(esc(x) for x in c.get("body_lines", [])) + "</p>")
    parts.append(f"<p class='marker'>{esc(marker)}</p>")
    return "".join(parts)


def pricing_html(c: dict, marker: str) -> str:
    cells = "".join(
        f"<td><b>{esc(p['name'])}</b><br/>{esc(p['price'])}<br/><span class='muted'>"
        + "<br/>".join(esc(f) for f in p.get("features", []))
        + "</span><br/>[ Choose plan ]</td>"
        for p in c["plans"]
    )
    parts = [f"<div class='bar'><b>{esc(c['brand'])}</b> &#160;&#160; Pricing</div>", "<h2>Plans and pricing</h2>"]
    parts.append(f"<table><tr>{cells}</tr></table>")
    for n in c.get("notes", []):
        parts.append(f"<p>{esc(n)}</p>")
    parts.append(f"<p class='marker'>{esc(marker)}</p>")
    return "".join(parts)


def marketing_html(c: dict, marker: str) -> str:
    return (
        f"<div class='bar'><b>{esc(c['brand'])}</b></div><h1>{esc(c['headline'])}</h1>"
        f"<p>{esc(c['body'])}</p><p>[ Get started ]</p><p class='marker'>{esc(marker)}</p>"
    )


def contract_html(c: dict, marker: str) -> str:
    body = "".join(f"<p>{esc(p)}</p>" for p in c["paragraphs"])
    return f"<h2>{esc(c['title'])}</h2>{body}<p class='marker'>{esc(marker)}</p>"


HTML_TEMPLATES = {
    "invoice": (invoice_html, A4),
    "web_billing": (web_billing_html, SCREEN),
    "email": (email_html, SCREEN),
    "pricing": (pricing_html, SCREEN),
    "marketing": (marketing_html, SCREEN),
    "contract": (contract_html, A4),
}


def html_to_pdf(body: str, size: tuple[int, int]) -> tuple[bytes, str]:
    pdf = fitz.open()
    page = pdf.new_page(width=size[0], height=size[1])
    rect = fitz.Rect(36, 36, size[0] - 36, size[1] - 36)
    spare, _scale = page.insert_htmlbox(rect, body, css=BASE_CSS, scale_low=0.5)
    if spare < 0:
        raise RuntimeError("content did not fit on the page")
    text = page.get_text()
    pdf.set_metadata({"title": "SI8 synthetic fixture", "producer": GENERATOR_VERSION, "creationDate": "", "modDate": ""})
    data = pdf.tobytes(garbage=4, deflate=True, no_new_id=True)
    return data, text


def rasterize(pdf_bytes: bytes, dpi: int) -> Image.Image:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pix = doc[0].get_pixmap(dpi=dpi, alpha=False)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")


def noise_layer(size: tuple[int, int], rng: random.Random, amount: int) -> Image.Image:
    """Seeded grey noise centred on 128, scaled to +/- amount."""
    raw = Image.frombytes("L", size, rng.randbytes(size[0] * size[1]))
    return raw.point(lambda v: 128 + (v - 128) * amount // 128).convert("RGB")


def add_noise(img: Image.Image, noise: Image.Image) -> Image.Image:
    """Additive zero-mean noise: out = img + (noise - 128)."""
    pos = noise.point(lambda v: max(0, v - 128) * 2)
    neg = noise.point(lambda v: max(0, 128 - v) * 2)
    return ImageChops.subtract(ImageChops.add(img, pos), neg)


def degrade(img: Image.Image, r: dict, rng: random.Random) -> Image.Image:
    if r.get("blur"):
        img = img.filter(ImageFilter.GaussianBlur(r["blur"]))
    if r.get("background"):
        pad = int(min(img.size) * 0.12)
        bg = Image.new("RGB", (img.width + 2 * pad, img.height + 2 * pad), (118, 96, 72))
        bg = add_noise(bg, noise_layer(bg.size, rng, 20))
        bg.paste(img, (pad, pad))
        img = bg
    if r.get("shear"):
        s = r["shear"]
        img = img.transform(img.size, Image.AFFINE, (1, s, -s * img.height / 2, 0, 1, 0), resample=Image.BICUBIC, fillcolor=(118, 96, 72))
    if r.get("rotate"):
        img = img.rotate(r["rotate"], resample=Image.BICUBIC, expand=True, fillcolor=(118, 96, 72))
    if r.get("shadow"):
        mask = Image.new("L", img.size, 0)
        d = ImageDraw.Draw(mask)
        d.polygon([(0, 0), (img.width * 0.55, 0), (img.width * 0.25, img.height), (0, img.height)], fill=90)
        mask = mask.filter(ImageFilter.GaussianBlur(40))
        img = Image.composite(Image.new("RGB", img.size, (0, 0, 0)), img, mask)
    if r.get("glare"):
        mask = Image.new("L", img.size, 0)
        d = ImageDraw.Draw(mask)
        cx, cy = img.width * 0.42, img.height * 0.30
        d.ellipse([cx - img.width * 0.22, cy - img.height * 0.06, cx + img.width * 0.22, cy + img.height * 0.06], fill=170)
        mask = mask.filter(ImageFilter.GaussianBlur(25))
        img = Image.composite(Image.new("RGB", img.size, (255, 255, 250)), img, mask)
    if r.get("brightness"):
        img = ImageEnhance.Brightness(img).enhance(r["brightness"])
    if r.get("contrast"):
        img = ImageEnhance.Contrast(img).enhance(r["contrast"])
    if r.get("noise"):
        img = add_noise(img, noise_layer(img.size, rng, r["noise"]))
    if r.get("scale"):
        img = img.resize((max(1, int(img.width * r["scale"])), max(1, int(img.height * r["scale"]))), Image.BILINEAR)
    if r.get("thumbnail_width"):
        w = r["thumbnail_width"]
        img = img.resize((w, max(1, int(img.height * w / img.width))), Image.BILINEAR)
    return img


def scene_image(rng: random.Random) -> Image.Image:
    img = Image.new("RGB", (1024, 768), (90, 130, 170))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 470, 1024, 768], fill=(70, 110, 60))
    for _ in range(14):
        x, y, s = rng.randrange(1024), rng.randrange(200, 700), rng.randrange(30, 140)
        d.ellipse([x, y, x + s, y + s], fill=(rng.randrange(256), rng.randrange(256), rng.randrange(256)))
    return img.filter(ImageFilter.GaussianBlur(1.5))


def encode(img: Image.Image, fmt: str, quality: int) -> bytes:
    buf = io.BytesIO()
    if fmt == "png":
        img.save(buf, format="PNG", optimize=False)
    else:
        img.save(buf, format="JPEG", quality=quality, optimize=False, progressive=False)
    return buf.getvalue()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE / "generated"))
    args = ap.parse_args()
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    marker = spec["synthetic_marker"]
    by_id = {d["id"]: d for d in spec["documents"]}
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    entries = []
    for doc in spec["documents"]:
        r = doc.get("render", {})
        fmt = r.get("format", "pdf")
        rng = random.Random(r.get("seed", 0))
        template = doc["template"]
        text = ""
        if template in HTML_TEMPLATES:
            fn, size = HTML_TEMPLATES[template]
            pdf_bytes, text = html_to_pdf(fn(resolve_content(doc, by_id), marker), size)
            if fmt == "pdf":
                data = pdf_bytes
                width = height = None
            else:
                img = degrade(rasterize(pdf_bytes, r.get("raster_dpi", 96)), r, rng)
                data, (width, height) = encode(img, fmt, r.get("jpeg_quality", 85)), img.size
        elif template == "blank":
            c = doc["content"]
            img = Image.new("RGB", (900, 1200), tuple(c["color"]))
            img = degrade(img, {"noise": c.get("noise", 0)}, rng)
            data, (width, height) = encode(img, fmt, r.get("jpeg_quality", 85)), img.size
        elif template == "scene":
            img = scene_image(rng)
            data, (width, height) = encode(img, fmt, r.get("jpeg_quality", 85)), img.size
        else:
            raise ValueError(f"unknown template {template}")

        ext = {"pdf": "pdf", "png": "png", "jpeg": "jpg"}[fmt]
        name = f"{doc['id']}.{ext}"
        (out / name).write_bytes(data)
        entries.append({
            "id": doc["id"],
            "file": name,
            "media_type": {"pdf": "application/pdf", "png": "image/png", "jpeg": "image/jpeg"}[fmt],
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "width": width,
            "height": height,
            "document_text": text,
        })

    manifest = {
        "generator_version": GENERATOR_VERSION,
        "spec_version": spec["spec_version"],
        "spec_sha256": hashlib.sha256(SPEC.read_bytes()).hexdigest(),
        "pymupdf_version": fitz.VersionBind,
        "pillow_version": Image.__version__,
        "documents": entries,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"wrote {len(entries)} fixtures to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

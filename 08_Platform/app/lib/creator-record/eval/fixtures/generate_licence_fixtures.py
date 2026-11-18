"""CR-DOC-READER-EXT-3 — render the synthetic licence/permission fixtures (licence-fixtures.json) to PDF or PNG.

Usage (from 08_Platform/app):
    python -I lib/creator-record/eval/fixtures/generate_licence_fixtures.py
Writes lib/creator-record/eval/fixtures/generated/licence/<fixture_id>.<pdf|png> (git-ignored) and prints each file's SHA-256.
Deterministic text layout; requires PyMuPDF and Pillow. Every person, company, address, email and phone number is fictional.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import sys

import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.join(HERE, 'licence-fixtures.json')
OUT = os.path.join(HERE, 'generated', 'licence')


def pdf_bytes(pages: list[list[str]]) -> bytes:
    doc = fitz.open()
    for lines in pages:
        page = doc.new_page(width=595, height=842)
        y = 80
        for i, line in enumerate(lines):
            size = 18 if i == 0 else 11
            page.insert_textbox(fitz.Rect(60, y, 535, y + 60), line, fontsize=size, fontname='helv')
            y += 34 if i == 0 else 26
    doc.set_metadata({})
    data = doc.tobytes(garbage=4, deflate=True, no_new_id=True)
    doc.close()
    return data


def png_bytes(lines: list[str]) -> bytes:
    img = Image.new('RGB', (1000, 120 + 44 * len(lines)), 'white')
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('arial.ttf', 26)
        title = ImageFont.truetype('arial.ttf', 36)
    except OSError:
        font = title = ImageFont.load_default()
    y = 40
    for i, line in enumerate(lines):
        d.text((50, y), line, fill='black', font=title if i == 0 else font)
        y += 52 if i == 0 else 44
    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=False)
    return buf.getvalue()


def main() -> int:
    with open(SPEC, encoding='utf-8') as f:
        spec = json.load(f)
    os.makedirs(OUT, exist_ok=True)
    for fx in spec['fixtures']:
        if fx['media'] == 'pdf':
            data, ext = pdf_bytes(fx['pages']), 'pdf'
        else:
            if len(fx['pages']) != 1:
                raise SystemExit(f"{fx['fixture_id']}: a PNG fixture has exactly one page")
            data, ext = png_bytes(fx['pages'][0]), 'png'
        path = os.path.join(OUT, f"{fx['fixture_id']}.{ext}")
        with open(path, 'wb') as out:
            out.write(data)
        print(f"{fx['fixture_id']}\t{ext}\t{len(data)}\t{hashlib.sha256(data).hexdigest()}")
    return 0


if __name__ == '__main__':
    sys.exit(main())

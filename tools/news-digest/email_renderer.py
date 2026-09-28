"""
SI8 News Intelligence -- Development-oriented email rendering (SI8-INTEL-
NEWS-4B).

Pure presentation over an already-composed `IntelligenceDigest`
(composition.py) -- this module reads `BoundedInterpretation`/
`DevelopmentPriority` fields, it never computes or mutates them. No model
call. No Living Knowledge / CRC import of any kind.

Renders, in order: Executive Summary (when present) -> Material
Developments (HIGH) -> Monitor -> Living Knowledge / Product Signals (only
when non-empty) -> Marketing Opportunities (title/link shortlist only, no
generated copy) -> a compact footer noting deferred count and any degraded
state.
"""

from __future__ import annotations

from composition import IntelligenceDigest

_STYLE = {
    "bg": "#FAFAF7",
    "ink": "#1a1918",
    "muted": "#888",
    "border": "#e5e5e5",
    "accent": "#C8900A",
    "high": "#b91c1c",
    "monitor": "#555",
}


def _esc(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _primary_url(development) -> str:
    """The earliest-published contributing article's URL, as the one
    clickable primary link for a Development -- consistent with
    Development.canonical_title's own deterministic "earliest article"
    convention (development.py)."""
    ordered = sorted(development.articles, key=lambda a: a.get("pub_date") or "")
    return ordered[0].get("url", "#") if ordered else "#"


def _cluster_line(development) -> str:
    return ", ".join(sorted(development.clusters)) or "(no cluster recorded)"


def _sources_line(development) -> str:
    names = development.sources
    if len(names) <= 1:
        return f"1 source: {names[0] if names else 'Unknown'}"
    return f"{development.source_count} articles, {len(names)} source(s): {', '.join(names)}"


def _executive_summary_block(digest: IntelligenceDigest) -> str:
    if not digest.executive_summary or not digest.executive_summary.statements:
        return ""
    prose = " ".join(_esc(s.text) for s in digest.executive_summary.statements)
    return f"""
    <div style="background:#fffbf0;border-left:3px solid {_STYLE['accent']};padding:14px 18px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:{_STYLE['accent']};letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;">Executive Summary</div>
      <p style="margin:0;font-size:14px;color:{_STYLE['ink']};line-height:1.6;">{prose}</p>
    </div>
    """


def _material_development_card(item) -> str:
    development, interp, priority = item
    degraded_note = (
        '<p style="margin:6px 0 0;font-size:11px;color:#b91c1c;font-style:italic;">'
        "Priority classification degraded this run -- shown at a conservative default.</p>"
        if priority.degraded else ""
    )
    return f"""
    <div style="border:1px solid {_STYLE['border']};border-radius:6px;padding:16px 18px;margin-bottom:12px;background:#fff;">
      <div style="font-size:11px;font-weight:700;color:{_STYLE['high']};letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">Priority: HIGH</div>
      <a href="{_primary_url(development)}" style="color:{_STYLE['ink']};font-size:16px;font-weight:700;text-decoration:none;line-height:1.4;display:block;margin-bottom:4px;">{_esc(development.canonical_title)}</a>
      <div style="color:{_STYLE['muted']};font-size:12px;margin-bottom:10px;">Cluster(s): {_esc(_cluster_line(development))}</div>
      <p style="margin:0 0 8px;font-size:13px;color:{_STYLE['ink']};line-height:1.55;"><strong>What happened:</strong> {_esc(interp.source_facts)}</p>
      <p style="margin:0 0 8px;font-size:13px;color:{_STYLE['ink']};line-height:1.55;"><strong>Why SI8 cares:</strong> {_esc(interp.si8_relevance)}</p>
      <p style="margin:0 0 8px;font-size:13px;color:{_STYLE['ink']};line-height:1.55;"><strong>Watch next:</strong> {_esc(interp.uncertainty_watch)}</p>
      <p style="margin:0;font-size:12px;color:{_STYLE['muted']};">{_esc(_sources_line(development))}</p>
      {degraded_note}
    </div>
    """


def _material_developments_section(digest: IntelligenceDigest) -> str:
    if not digest.high:
        return ""
    cards = "".join(_material_development_card(item) for item in digest.high)
    return f"""
    <h2 style="color:{_STYLE['high']};font-size:15px;font-weight:700;margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid {_STYLE['high']};letter-spacing:0.5px;">
      MATERIAL DEVELOPMENTS &nbsp;<span style="font-weight:400;font-size:13px;">({len(digest.high)})</span>
    </h2>
    {cards}
    """


def _monitor_row(item) -> str:
    development, interp, priority = item
    return f"""
    <div style="border-bottom:1px solid {_STYLE['border']};padding:8px 0;">
      <a href="{_primary_url(development)}" style="color:{_STYLE['ink']};font-size:13px;font-weight:600;text-decoration:none;">{_esc(development.canonical_title)}</a>
      <div style="color:{_STYLE['muted']};font-size:11px;margin-top:2px;">{_esc(_cluster_line(development))} &middot; {_esc(priority.rationale)} &middot; {_esc(_sources_line(development))}</div>
    </div>
    """


def _monitor_section(digest: IntelligenceDigest) -> str:
    if not digest.monitor:
        return ""
    rows = "".join(_monitor_row(item) for item in digest.monitor)
    return f"""
    <h2 style="color:{_STYLE['monitor']};font-size:15px;font-weight:700;margin:28px 0 8px;padding-bottom:8px;border-bottom:2px solid #ddd;letter-spacing:0.5px;">
      MONITOR &nbsp;<span style="font-weight:400;font-size:13px;">({len(digest.monitor)})</span>
    </h2>
    {rows}
    """


def _lk_product_signals_section(digest: IntelligenceDigest) -> str:
    if not digest.lk_product_signals:
        return ""
    rows = "".join(
        f'<li style="margin:4px 0;font-size:13px;color:{_STYLE["ink"]};">'
        f'<a href="{_primary_url(d)}" style="color:{_STYLE["ink"]};text-decoration:underline;">{_esc(d.canonical_title)}</a>'
        f' <span style="color:{_STYLE["muted"]};">-- flagged: {_esc(interp.action)}</span></li>'
        for d, interp in digest.lk_product_signals
    )
    return f"""
    <h2 style="color:{_STYLE['ink']};font-size:14px;font-weight:700;margin:28px 0 8px;letter-spacing:0.5px;">LIVING KNOWLEDGE / PRODUCT SIGNALS</h2>
    <p style="margin:0 0 8px;font-size:12px;color:{_STYLE['muted']};font-style:italic;">Internal review queue only -- these are NOT findings, and NOT a claim that governed knowledge is wrong or must change. A human decides whether any review is warranted.</p>
    <ul style="margin:0;padding-left:18px;">{rows}</ul>
    """


def _marketing_opportunities_section(digest: IntelligenceDigest) -> str:
    if not digest.marketing_opportunities:
        return ""
    rows = "".join(
        f'<li style="margin:4px 0;font-size:13px;color:{_STYLE["ink"]};">'
        f'<a href="{_primary_url(d)}" style="color:{_STYLE["ink"]};text-decoration:underline;">{_esc(d.canonical_title)}</a></li>'
        for d, _interp in digest.marketing_opportunities
    )
    return f"""
    <h2 style="color:{_STYLE['ink']};font-size:14px;font-weight:700;margin:28px 0 8px;letter-spacing:0.5px;">OPTIONAL MARKETING OPPORTUNITIES</h2>
    <p style="margin:0 0 8px;font-size:12px;color:{_STYLE['muted']};font-style:italic;">A shortlist only -- no content generated here.</p>
    <ul style="margin:0;padding-left:18px;">{rows}</ul>
    """


def _footer_note(digest: IntelligenceDigest) -> str:
    parts = [f"{digest.deferred_count} development(s) deferred this cycle (admission capacity, not judged unimportant)"]
    if digest.degraded_notes:
        parts.append(f"{len(digest.degraded_notes)} degraded note(s): " + "; ".join(digest.degraded_notes))
    return " &middot; ".join(_esc(p) for p in parts)


def build_intelligence_email_html(digest: IntelligenceDigest) -> str:
    if not digest.high and not digest.monitor:
        body = '<p style="color:#888;font-style:italic;margin:24px 0;">No material developments found this cycle.</p>'
    else:
        body = (
            _executive_summary_block(digest)
            + _material_developments_section(digest)
            + _monitor_section(digest)
            + _lk_product_signals_section(digest)
            + _marketing_opportunities_section(digest)
        )

    stats_line = f"{len(digest.high)} high &middot; {len(digest.monitor)} monitor &middot; {digest.deferred_count} deferred"

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:{_STYLE['bg']};font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;">

    <div style="background:#1a1918;border-radius:8px 8px 0 0;padding:24px 28px;">
      <div style="color:{_STYLE['accent']};font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">SuperImmersive 8</div>
      <div style="color:#fff;font-size:20px;font-weight:700;margin-top:4px;">News Intelligence</div>
      <div style="color:#aaa;font-size:12px;margin-top:4px;">{digest.date} &nbsp;&middot;&nbsp; {stats_line}</div>
    </div>

    <div style="background:#fff;border-radius:0 0 8px 8px;padding:24px 28px;box-shadow:0 2px 6px rgba(0,0,0,0.07);">
      {body}
      <div style="border-top:1px solid #eee;margin-top:28px;padding-top:14px;font-size:11px;color:#bbb;">
        {_footer_note(digest)}
      </div>
      <div style="margin-top:12px;font-size:11px;color:#bbb;text-align:center;">
        SI8 News Intelligence &nbsp;&middot;&nbsp; PMF Strategy Inc. d/b/a SuperImmersive 8
      </div>
    </div>

  </div>
</body>
</html>"""

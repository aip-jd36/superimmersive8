# SI8 Weekly Intelligence Digest

Automated news monitoring for AI rights, copyright, E&O insurance, brand policy, and competitor activity. Runs every Monday, scores articles for SI8 relevance using Claude, and sends a digest email via Resend.

## How it works

1. **Fetch** — Pulls articles from Google News RSS across 6 keyword clusters (no API key required)
2. **Score** — Claude Haiku assesses each article: relevance score (1–10), why it matters to SI8, recommended action
3. **Categorize** — Articles sorted into: `POST ON LINKEDIN` / `UPDATE DOCS` / `MONITOR` / `SKIP`
4. **Deliver** — Weekly email sent via Resend to jd@superimmersive8.com every Monday 8am Taipei time

## Setup (one-time)

### 1. Add GitHub Secrets

Go to: `github.com/aip-jd36/superimmersive8` → Settings → Secrets and variables → Actions → New repository secret

Add these two secrets:

| Secret name | Value |
|-------------|-------|
| `ANTHROPIC_API_KEY` | Your Claude API key (from console.anthropic.com) |
| `RESEND_API_KEY` | Your Resend API key (same one used for the creator portal) |

### 2. That's it

The workflow runs automatically every Monday. You can also trigger it manually from:
GitHub → Actions tab → "SI8 Weekly Intelligence Digest" → Run workflow

## Running locally

```bash
cd tools/news-digest
pip install -r requirements.txt

export ANTHROPIC_API_KEY=sk-ant-...
export RESEND_API_KEY=re_...

# Full run (sends email)
python digest.py

# Dry run (scores articles, writes HTML preview to /tmp/si8-digest-preview.html, no email)
python digest.py --dry-run

# Extend lookback window (e.g., first run, or after a holiday)
python digest.py --lookback 14
```

## Tuning keywords

Edit `keywords.py` to:
- Add/remove search queries within a cluster
- Add a new cluster entirely
- Update `SI8_CONTEXT` if SI8's positioning changes significantly

## Cost

Each weekly run makes ~24 Google News RSS requests (free) + ~4–8 Claude Haiku API calls (~$0.05–0.10 per run).

## Email format

```
SI8 Weekly Intelligence Digest — April 7, 2026
3 high · 5 monitor · lookback 7 days

🔴 HIGH RELEVANCE — Act on these
[9/10] POST ON LINKEDIN | UPDATE DOCS
"E&O insurers adding AI video exclusions to standard media policies"
Hollywood Reporter · Apr 5
Why it matters: Direct validation of SI8's pain point...
→ Update: COMPETITIVE_ANALYSIS_CAAS_2026.md
Draft hook: "E&O insurers are now excluding AI video..."

🟡 MONITOR — Worth knowing
[6/10] MONITOR
"Adobe Firefly expands commercial coverage"
...
```

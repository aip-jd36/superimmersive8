# Marketing Site — Version Snapshots

Each subfolder is a complete snapshot of the marketing site HTML, CSS, JS, and routing config at a specific point in time. Snapshots do not include `api/` serverless functions, `images/`, or git metadata.

## Naming convention

```
v{major}-{YYYY-MM-DD}/
```

`major` increments when the design or positioning changes significantly. The date is when the snapshot was taken.

## Current snapshots

| Folder | Date | Description | Git tag |
|--------|------|-------------|---------|
| `v4-2026-07-12` | Jul 12, 2026 | v4 CaaS site — "Get Your AI Video Cleared for Commercial Use". Two-tier pricing ($29 Creator Record / $499 SI8 Certified). CarFax framing. Urban Drift sample. | `marketing-site-v4` |

## What is included in each snapshot

- `index.html` — homepage
- `how-it-works/index.html`
- `pricing/index.html`
- `rights-verified/index.html`, `chain-of-title/index.html`, `playbook/index.html`
- `sample/index.html`
- `zh/` — Traditional Chinese equivalents of all pages above
- `styles.css`, `script.js`, `si8-logo.svg`
- `vercel.json` — routing rules active at time of snapshot

Not included: `api/` serverless functions, `images/` assets, `_archive/` (v3 files).

## How to restore a version

### Option A — Copy files back manually (no git required)

Copy the contents of the snapshot folder over `07_Website/`:

```powershell
$ver = "v4-2026-07-12"
$src = "C:\Users\User\Desktop\superimmersive8\07_Website\_versions\$ver"
$dst = "C:\Users\User\Desktop\superimmersive8\07_Website"

# Copy root files
Copy-Item "$src\index.html" "$dst\index.html" -Force
Copy-Item "$src\styles.css" "$dst\styles.css" -Force
Copy-Item "$src\script.js"  "$dst\script.js"  -Force
Copy-Item "$src\si8-logo.svg" "$dst\si8-logo.svg" -Force
Copy-Item "$src\vercel.json"  "$dst\vercel.json"  -Force

# Copy all HTML subdirectories
Copy-Item "$src\how-it-works" "$dst\how-it-works" -Recurse -Force
Copy-Item "$src\pricing"      "$dst\pricing"      -Recurse -Force
Copy-Item "$src\rights-verified" "$dst\rights-verified" -Recurse -Force
Copy-Item "$src\sample"       "$dst\sample"       -Recurse -Force
Copy-Item "$src\zh"           "$dst\zh"           -Recurse -Force
```

Then commit and push to deploy.

### Option B — Restore via git tag

```bash
git checkout marketing-site-v4 -- 07_Website/index.html 07_Website/styles.css 07_Website/script.js 07_Website/how-it-works 07_Website/pricing 07_Website/rights-verified 07_Website/sample 07_Website/zh
```

Then commit and push to deploy.

## How to take a new snapshot

Before a redesign:

```powershell
$label = "v5-2026-08-01"   # adjust version + date
$src = "C:\Users\User\Desktop\superimmersive8\07_Website"
$dst = "C:\Users\User\Desktop\superimmersive8\07_Website\_versions\$label"
# ... (copy commands as above, substituting $label for the destination)
```

Then add the new row to the table above and create a git tag:

```bash
git tag marketing-site-v5
git push origin marketing-site-v5
```

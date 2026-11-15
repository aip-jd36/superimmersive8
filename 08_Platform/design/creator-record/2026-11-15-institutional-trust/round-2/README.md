# CR-DESIGN-1 Round 2 — Institutional Trust Export Package (archive)

| | |
|---|---|
| Milestone | `CR-DESIGN-1` Round 2, archived under `CR-DESIGN-2A` |
| Date | 2026-11-15 |
| Origin | Claude Design (founder-led), exported for engineering feasibility review |
| **Status** | **REFERENCE ONLY — NOT AN IMPLEMENTATION SPECIFICATION. NO WORDING, DATA OR PRODUCT CHANGE IN IT IS APPROVED.** |
| Engineering reconciliation | [`08_Platform/implementation/cr-design-2a/`](../../../../implementation/cr-design-2a/README.md) (PROPOSED — NOT APPROVED) |

## What the package is, by status

| Part of the package | Status |
|---|---|
| Visual direction: three registers, guidance-first hierarchy, tokens, type system, component shapes | **Preferred direction (PM/Architecture, 2026-11-15).** Subject to founder approval and to the reconciliation in `cr-design-2a/`. |
| Every customer-facing string in the mockups | **Not approved.** Many differ from the approved v4/v5 wording; see `cr-design-2a/01-WORDING-RECONCILIATION.md`. The approved template sets remain authoritative. |
| `change-register/` proposals | **Not approved.** Several entries are superseded or corrected by `cr-design-2a/` (e.g. applicability needs no new data concept; "verbatim" claims do not hold). |
| Synthetic examples (Pika, ElevenLabs, Suno, "Nova Video 3", multi-document readings, applicability panel, CR-2026-SYNTHETIC) | **Fixture-only illustrations.** They are not product behaviour, not provider coverage and not governed guidance. Pika is withdrawn from the ledger (LEDGER-3). |
| Page numbers, page counts, identifiers, fingerprints | Reference values from one record (CR-2026-7E82CA09). Not targets. |
| The "8" mark | Provisional and **excluded** (PM/Architecture recommendation). |
| Standalone HTML and `.dc.html` | Visual references at a fixed page size. Not production templates. |

## Files

The original ZIP is stored byte-for-byte and not extracted, so no file is stored twice.

| Stored file | Original | Bytes | SHA-256 |
|---|---|---|---|
| `SI8-CreatorRecord-Round2-Export.zip` | `SI8-CreatorRecord-Round2-Export.zip` | 1,434,268 | `3f405c0e0d8142fe0dbe50a0deaca0f03edabdfef0ba67eaf7522b55eaa7eda0` |

Two PDFs supplied separately alongside the ZIP, `SI8-Creator-Record-Complete-Reference.pdf` and `SI8-Creator-Record-Variants-and-StressTests.pdf`, are byte-identical to the ZIP members of the same name (hashes below), so they are not stored again.

### ZIP inventory (54 files, paths under `export/`)

| Path | Bytes | SHA-256 |
|---|---|---|
| `00-README-package-manifest.md` | 4096 | `72d8baef54a3fa6b3ed12f60e8807dc3d030a29f15baedfb6d385f4ab5439d63` |
| `change-register/SI8-Creator-Record-Proposed-Change-Register.md` | 9496 | `6ff780bb2919c2d5e7557179e0b0b253d7d32d9b258b07b8a52124dbc5d11af7` |
| `design-system/02-typography.md` | 2313 | `7ed573da7508c4a0063eb9d1135cae9059046d856f3c9843bd7ed96c146687e1` |
| `design-system/03-color-and-print.md` | 2944 | `37c773c896431e997fd3a7738204498decd709574c3c7b75549a78bd239413e4` |
| `design-system/04-layout-and-grid.md` | 1781 | `686b422780139ed96ac38698e0db002591f8bd152bca92e28242d386ab2b8e71` |
| `design-system/05-components.md` | 5948 | `e280a4877617fcc21c04c0e5611389bf87c0dc92e5fc83d320fc760fa39f9b5b` |
| `design-system/06-pagination-and-generation.md` | 4272 | `5d9990c604cf5ddfb9aad3986b792a2952fab18ea6ba61c8cbc3d1ccab0d8c5c` |
| `design-system/07-accessibility.md` | 2924 | `bd41f367134f04cac3dc3844143d56316a0c7b9aa4abe1207b4a5ec934d09bee` |
| `design-system/08-governance-notes.md` | 3319 | `a907264bf3d7eae271da154dfa7e6da5589d602d8b5b62cd8f2db57de7532987` |
| `design-system/README.md` | 5605 | `4741e269a9067a03d90bb179b2acd1593557aeaff813598aeb66ba028c7a9829` |
| `design-system/design-system.json` | 566 | `bf0491402b5271aa9825ee8323215a124c140f3f945974800a81f5058119fe09` |
| `design-system/tokens.json` | 9047 | `b22cf31f1edfe7469d28d7be04e7c2204bd535e85e0f016e107a938c371800db` |
| `design-tokens/tokens.json` | 9047 | `b22cf31f1edfe7469d28d7be04e7c2204bd535e85e0f016e107a938c371800db` |
| `pdf/Considerations.pdf` | 102882 | `70838ab0eaf83391dfd7015e71cccd93135c7d0e66d65aae7e395a5da333912b` |
| `pdf/Declarations-Stress.pdf` | 98857 | `a63d23088eb1261a6c9f669c8cd45f98a2bfcb3273bab05d248d7cef875b4517` |
| `pdf/Declarations.pdf` | 88872 | `190f0fbf2e8667a29712667d59674cc418dde442b01eb899626873549b50e7cb` |
| `pdf/DocFree.pdf` | 104182 | `4f5d314fc62affde7d942036c6778565adc673733b373bf5d00055e83a5cd5a0` |
| `pdf/DocReading-Multi.pdf` | 104366 | `ee5a764ce8828586ce7ecc42704282d28ce9234a561f1982b627dc1620f0c816` |
| `pdf/DocumentReading.pdf` | 103308 | `c6f5d48af54385762f8044a3585477bcd10eccb489d7f4f3f900343085876e55` |
| `pdf/DocumentReading2.pdf` | 76877 | `27984649a6249cb50b13597d7dae79ecce4bc69354437e68926aba8b9ffdb312` |
| `pdf/FP-Multi.pdf` | 81725 | `1d459b6116b248ab91898718ea360613fb2b1e2ff86a8e370e8a1028085cd50c` |
| `pdf/FP-None.pdf` | 86397 | `28a715026c78932021c479dfb5395cfbe74c8ffa74164202264e321aa9b6b3ba` |
| `pdf/Guidance-Multi.pdf` | 108305 | `3d3c56d67db1df6396ac0b8b80679140b4a7e812a352454191aff94a75c69171` |
| `pdf/HowMade.pdf` | 78318 | `54151f6821c3aa0bbb574d9ef4221163df9fff4a58926ccca56c9a4ccfa8f817` |
| `pdf/Limitations.pdf` | 78651 | `7bf09d2e55cdcf2e4be63e7582d30787854db411c5558dc2e626f1240faf4635` |
| `pdf/Main.pdf` | 82273 | `3fb1ad32195701ecd83a4bf155c50d825a0e82d0f7277e331d7879ec36227d20` |
| `pdf/SI8-Creator-Record-Complete-Reference.pdf` | 612610 | `170f9341868f3229a5e833df2e0497251de78a4e90782eb39a22e4dbf55a001e` |
| `pdf/SI8-Creator-Record-Variants-and-StressTests.pdf` | 585056 | `af65e01d2c3e9ca86080b04bbd0de89c8464e36207d41f4d8a69a75729678b34` |
| `source/Considerations.dc.html` | 9144 | `849548a8d1d929b02c18864f5ad7a14e317ac8d839fd2a510ba579e9f29fdbcf` |
| `source/Declarations-Stress.dc.html` | 8707 | `358f6f456385bbca56846c6fde8d6348b23e0854681682bbb470b92b57596d30` |
| `source/Declarations.dc.html` | 9280 | `907c06d568169dde50c672086cf3a2ed78bfa9bce2cd39ba772a867429b6bf12` |
| `source/DocFree.dc.html` | 4016 | `3e9c4e2d7013f298242b977b944cfd1862de1ed4fc5ab17225273c10b4a4d4e3` |
| `source/DocReading-Multi.dc.html` | 8495 | `57c4ee5d278c5124d7d462f66c7eba6551d7530c482f7af0a882f154cb058caa` |
| `source/DocumentReading.dc.html` | 9205 | `a1762aa57de0742dd0a1150f9d397fafc0e1bd544645d1415e1f32e349a2f057` |
| `source/DocumentReading2.dc.html` | 6825 | `343d519388c2b99e650770d59032d04b98cc662425ca12737b0cbd7c3096173b` |
| `source/FP-Multi.dc.html` | 9062 | `d8449b7f5a41593b1692bf45c887eae27705d9435ae4fda3373a3c54aca7fa55` |
| `source/FP-None.dc.html` | 7943 | `a6b77574edefe3cdf94968e01aaf821122c057e0e507312b2b1160f0253277b5` |
| `source/Guidance-Multi.dc.html` | 8535 | `217aa080b67b63cda6811909780ed87a311bfc9e04b82f3fbb9cd4313893f87c` |
| `source/HowMade.dc.html` | 10008 | `b5b164028759c04eea214213b6100df0803ca04d43d60868295b55d44f10fd2e` |
| `source/Limitations.dc.html` | 6949 | `f2301eccf6581d98e0c35eac259e6527fd6ae2385187d8bf2cd7ca764679f831` |
| `source/Main.dc.html` | 8828 | `ed7a4d6a6f3b15a4298b4f739440949cf563661195ffac7f037a8ef4d2a1f13f` |
| `source/standalone-html/Considerations.html` | 8908 | `2d39c034f4e213d64741399dd80f91f2c3fe6f3ef070f753bd697da52a8979ac` |
| `source/standalone-html/Declarations-Stress.html` | 8471 | `57789b124f8ca9fe13349bf39ff9252301a990f4647dc9de8309003093ed9a29` |
| `source/standalone-html/Declarations.html` | 9044 | `3079cd58ef52894e8abf9d76d4b43aa928d84c08174cf0e02bcf7412fdbef5b1` |
| `source/standalone-html/DocFree.html` | 3780 | `f2362c3e62ab89b10dbb790d0d677bdc07e27a87e57d38d489f722959dc01bb8` |
| `source/standalone-html/DocReading-Multi.html` | 8259 | `d800d1a7bc47fb12f033cfd5f8673b2da1a3eb2b6c53f52c464534a718edbab7` |
| `source/standalone-html/DocumentReading.html` | 8969 | `3d770ad867bcbac926830864e15ccc77e4ea8cc24ee7320439723b890f29f39a` |
| `source/standalone-html/DocumentReading2.html` | 6589 | `4d9e24f36f9be472046d098c2dc9fac33373171f9b54042fd7cd46797a6e715d` |
| `source/standalone-html/FP-Multi.html` | 8826 | `41a1e3d3a6b76cd1c2d8a9ff69b6c61f681c220f4133e73fc240c8f036add9aa` |
| `source/standalone-html/FP-None.html` | 7707 | `c6f53d7c369992e49a5b031d65019f21060a1034f9725220d8bda89c783ee839` |
| `source/standalone-html/Guidance-Multi.html` | 8299 | `ba6810b373cbbb54209e141b662d5aef55932f53d98fa897e89347eb517f1197` |
| `source/standalone-html/HowMade.html` | 9772 | `a49450423c8944f4d36c99b142f168e9b96d361ed34dadd6a3c9b427efd85e98` |
| `source/standalone-html/Limitations.html` | 6713 | `ade13552843dea7eca145885596bdb1edce7da616c99aeac956f5a6179d206ab` |
| `source/standalone-html/Main.html` | 8592 | `146ee32f94ef0be0d30557f8f56f6f6eed98f20795262bbee9352263902d0e12` |

`design-system/tokens.json` and `design-tokens/tokens.json` are identical copies inside the ZIP.

## Pre-commit checks (repository is public)

- No credentials, tokens, keys, cookies or email addresses. The only URLs are Google Fonts stylesheet imports in the HTML sources.
- Personal data: the change register carries the author line "prepared by JD Chang", which matches the repository's public commit author. No other personal data.
- Production identifiers in the mockups (record CR-2026-7E82CA09, prepared record reference, answers fingerprint, document fingerprint, reading reference) already appear in `08_Platform/prds/PRD_CREATOR_RECORD_v2_MVP_SCOPE.md`. The record is the operator's UAT purchase with a synthetic receipt.
- Reference PDFs are rendered by Chromium/Skia or assembled by pypdf; they are untagged and embed substitute fonts (Liberation Serif, DejaVu Sans Mono).
- Binary integrity: the ZIP is classified binary by Git; PDFs are covered by the root `.gitattributes` (`*.pdf binary`).

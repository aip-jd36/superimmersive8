# CLAIM-COPY-004 — Source Hardening Research

**Status: RESEARCH ARTIFACT, NOT GOVERNED KNOWLEDGE.** Candidate source material only, per `GOVERNED-CLAIMS.md`'s own governance discipline ("existing repo research is candidate source material only — never automatically governed knowledge"). Produced 2026-08-16 in response to a PM-directed source-hardening research task following the CRC-publication governance review for `CLAIM-COPY-004`. **Does not change any governed claim, lifecycle, or CRC-eligibility state.** `CLAIM-COPY-004-v1` remains `Lifecycle: Adopted`, `CRC Eligible: Pending` in `GOVERNED-CLAIMS.md` — this document does not modify that record.

**Left uncommitted pending PM review**, per this task's own instruction that research artifacts may need to stay outside the permanent record until reviewed — see the accompanying report for the exact reasoning.

## Claim under review

CLAIM-COPY-004-v1, `crc_candidate_statement`:

> "Whether a platform's terms allow commercial use of the output, and whether that output is copyrighted (and who owns it), are two separate questions — a platform granting commercial-use permission doesn't by itself answer either."

## Research question

Can authoritative sources support this as a bounded SI8 synthesis, even though no single external source states it verbatim?

## Statutory research (17 U.S.C.) — all quotes independently fetched live from copyright.gov, 2026-08-16

| Provision | Source | Quote | Supports |
|---|---|---|---|
| § 101 (definitions) | copyright.gov/title17/92chap1.html | "A 'transfer of copyright ownership' is an assignment, mortgage, exclusive license, or any other conveyance... **but not including a nonexclusive license.**" | A nonexclusive license (the legal character of an ordinary platform "you may use this commercially" grant) is, by statutory definition, *not* a transfer of copyright ownership. |
| § 102 | copyright.gov/title17/92chap1.html | "Copyright protection subsists, in accordance with this title, in original works of authorship fixed in any tangible medium of expression..." | Copyright status is a statutory condition determined by the Act itself (originality/fixation/authorship), not something a private contract creates or confers. |
| § 201 | copyright.gov/title17/92chap2.html | "Copyright in a work protected under this title vests initially in the author or authors of the work." | Ownership is an authorship-determined, statutory default — not a platform-conferred status. |
| § 202 | copyright.gov/title17/92chap2.html | "Ownership of a copyright... is distinct from ownership of any material object in which the work is embodied." / "Transfer of ownership of any material object... does not of itself convey any rights in the copyrighted work..." | Direct structural analogue: possessing/being permitted to use a thing is legally distinct from owning the copyright in it. |
| § 204 | copyright.gov/title17/92chap2.html | "A transfer of copyright ownership... is not valid unless an instrument of conveyance, or a note or memorandum of the transfer, is in writing and signed..." | An actual ownership transfer requires specific formalities a bare permission/use-grant clause does not, by itself, satisfy. |

All four provisions were fetched directly from the official U.S. Copyright Office statute pages on 2026-08-16, not reused from prior SI8 research without re-checking.

## Platform Terms of Service research (Tier 2 — contractual primary sources)

| Provider | Source | Fetch status | Relevant language | Effective/updated date |
|---|---|---|---|---|
| Runway | runway.com/terms-of-use | **Verified live**, direct fetch | "The Company does not claim ownership of any of your Inputs or Outputs." / "the Company does not restrict your commercial use of your Outputs." / "COMPANY PARTIES MAKE NO WARRANTY, REPRESENTATION OR CONDITION" regarding Outputs / "OUTPUTS MAY NOT BE UNIQUE" | May 11, 2026 |
| ElevenLabs | elevenlabs.io/terms-of-use | **Verified live**, direct fetch | "**As between you and ElevenLabs**, you retain all rights in and to your Output." (explicitly relative/contractual framing, not a copyright-law determination) / disclaimers of "title, and non-infringement" / "the Output... may not be unique across users" | March 31, 2026 |
| Kling | kling.ai/docs/user-policy | **NOT independently verified** — official domain returned HTTP 446 on every direct-fetch attempt (including an alternate app subdomain); Wayback Machine also unreachable in this environment. Search-engine synthesis (unverified, third-party-summarized) suggests similar "does not claim ownership" / paid-tier commercial-use language, but several top search results for "Kling terms of service" resolve to apparent **third-party API-reseller sites** (e.g. kling3.io, klingo1.co) that may not reflect the official Kuaishou/Kling terms at all. | Unknown |
| Adobe (Firefly/Gen AI terms) | adobe.com (multiple URLs) | **NOT independently verified** — every direct-fetch attempt timed out or reset. Search-engine synthesis indicates an indemnification-based model (Adobe defends certain third-party IP claims against "Indemnified Firefly Output") rather than the "we don't claim ownership" framing seen at Runway/ElevenLabs — genuinely different contractual structure, not yet independently confirmed. A user community thread flags user confusion about Adobe's ownership/copyright framing, which is itself a signal worth future investigation, not a verified fact. | Unknown |
| Google (Gemini/generative AI terms) | policies.google.com/terms/generative-ai | Fetched, but the retrieved document is a **superseded version** ("no longer apply as of May 22, 2024") containing no ownership/commercial-use language at all. **Not usable as current evidence.** | Superseded |
| OpenAI | not attempted | Not reached in this research pass (time-bounded; Sora already removed from marketing copy per prior product decision, lower priority for this specific claim). | — |

## Proposition map

```
P-STAT-1 (§101):     A nonexclusive license/permission grant is, by statutory definition,
                      NOT a "transfer of copyright ownership."
P-STAT-2 (§102):      Copyright status arises "in accordance with this title" — a statutory
                      condition, not a contractually-created one.
P-STAT-3 (§201):      Ownership vests in the author, by default — not in whoever is granted
                      permission to use the work.
P-STAT-4 (§202):      Ownership of the copyright is legally distinct from being permitted to
                      use/possess the thing it's embodied in (direct structural analogue).
P-STAT-5 (§204):      An actual ownership transfer requires specific formalities a bare
                      permission clause does not, by itself, satisfy.
P-CONTRACT-1 (Runway): A real, current, major AI video platform's own Terms frame commercial-use
                      permission as non-ownership-claiming and expressly disclaim any warranty
                      regarding the Output's protectability/uniqueness.
P-CONTRACT-2 (11Labs): A real, current, major AI platform's own Terms frame "you retain rights"
                      EXPLICITLY as "as between you and [platform]" — a relative, contractual
                      allocation, not an assertion that enforceable copyright exists at all.

THEREFORE, SI8 Synthesis S1 (= the existing CLAIM-COPY-004 statement):
  "A platform's commercial-use permission and copyright ownership/copyrightability are two
   separate questions; permission alone doesn't establish either."
```

S1 is a **governed synthesis**, not a single directly-source-backed proposition and not an unsupported internal framework — it is assembled from P-STAT-1 through P-STAT-5 (Tier 1, directly verified 2026-08-16) plus P-CONTRACT-1/2 (Tier 2, directly verified 2026-08-16, real-world confirmation that the pattern the statute describes is exactly how actual major platforms structure their own Terms).

## Clause-by-clause scoring

| Clause | Support | Basis |
|---|---|---|
| P1 — commercial-use permission distinct from copyrightability | **SUPPORTED** | §102 (copyright status is statutory, not contract-conferred) |
| P2 — commercial-use permission distinct from copyright ownership | **SUPPORTED** | §101 (nonexclusive license excluded from "transfer of ownership"), §201, §202 |
| P3 — permission alone does not determine copyrightability | **SUPPORTED** | §102, reinforced by Runway's explicit no-warranty-of-uniqueness/protectability language |
| P4 — permission alone does not determine copyright ownership | **SUPPORTED** | §101, §202, §204 (formalities a bare permission clause doesn't meet), reinforced by ElevenLabs' explicit "as between you and us" relative framing |

No clause scored UNSUPPORTED or merely PARTIALLY SUPPORTED for the United States. See the accompanying report for the jurisdiction-scope caveat (this table is US-evidenced only).

## Counterexample check (contractual assignment)

Neither verified platform (Runway, ElevenLabs) contains an actual copyright-assignment clause in the § 204 sense — both use disclaim-ownership-claim / relative-retention language, consistent with a nonexclusive-license characterization, not an assignment. The existing claim's "doesn't **by itself**" hedge is therefore accurate against real current platform terms: it correctly leaves room for a hypothetical platform that DID include an explicit assignment clause (which would be a different, distinguishable scenario) without needing to have found one to be correct today.

## What this document is NOT

Not a re-adoption of CLAIM-COPY-004. Not a CRC-eligibility decision. Not independent legal advice. Not exhaustive comparative/international research (see accompanying report's jurisdiction-scope finding, superseded by Part 2 below). Candidate source material for PM's own review, per the same discipline every other document in this folder is already held to.

---

# Part 2 — Global-Scope Comparative Research (2026-08-17)

**Continuation of the research above**, directed at exactly one narrow question: does the structural distinction ("commercial-use permission alone does not determine whether copyright exists, or who owns it") hold across materially different legal systems, not just U.S. law? United Kingdom, European Union, Taiwan, and Japan were researched as a deliberate cross-section (common law / EU supranational / two distinct East Asian civil-law-influenced systems), not as exhaustive global coverage.

**Explicitly out of scope, not researched here:** AI-generated-work copyrightability, human-authorship thresholds, prompt-as-authorship, moral rights generally, work-for-hire/employment ownership generally, training-data legality, TDM exceptions, likeness/publicity, trademark, full commercial clearance. Only the license/permission-vs-existence-vs-ownership structural question was tested.

## United Kingdom — primary authority (all verified live, legislation.gov.uk, 2026-08-17)

| Provision | Quote | Supports |
|---|---|---|
| CDPA 1988 s.1(1) | "Copyright is a property right which subsists in accordance with this Part in the following descriptions of work..." | **Prop A** — subsistence is statutory, mirrors US §102 almost exactly |
| CDPA 1988 s.11(1) | "The author of a work is the first owner of any copyright in it, subject to the following provisions." | **Prop B** — authorship-based default ownership, mirrors US §201 |
| CDPA 1988 s.90(3) | "An assignment of copyright is not effective unless it is in writing signed by or on behalf of the assignor." | **License/assignment distinction** — formality requirement for assignment, mirrors US §204 |
| CDPA 1988 s.90(4) | "A licence granted by a copyright owner is binding on every successor in title to his interest in the copyright, except a purchaser in good faith for valuable consideration and without notice." | Confirms licence is treated as a legally distinct, lesser grant than assignment |

**UK classification:** Prop A **SUPPORTED**. Prop B **SUPPORTED**. License-vs-assignment **SUPPORTED**. (Note, flagged only to bound scope, not investigated further: CDPA s.9(3) contains a UK-specific "computer-generated works" authorship rule — not researched here; irrelevant to this narrow structural question.)

## European Union — primary authority (EUR-Lex, verified live, 2026-08-17)

| Provision | Quote | Supports |
|---|---|---|
| Directive 2001/29/EC (InfoSoc), Arts. 2–4 | Harmonizes the *scope* of exclusive rights (reproduction, communication to the public, distribution) EU-wide | Establishes EU-level rights-scope harmonization, but does not itself state who is the first owner of those rights |
| Directive 2006/115/EC (Rental and Lending Rights, codified), Art. 3(3) | "The rights referred to in paragraph 1 may be transferred, assigned or subject to the granting of contractual licences." | **License/assignment distinction, at EU level** — explicitly separates "transferred, assigned" from "contractual licences" |
| Directive 2006/115/EC, Art. 9(4) | "The distribution right may be transferred, assigned or subject to the granting of contractual licences." | Same distinction, restated for a second right |
| European Commission, Digital Strategy portal ("EU copyright rules") | "Moral rights include the right to claim authorship of the work... They are not harmonised at EU level." | Confirms at least moral-rights authorship is expressly left to national law; the page does not explicitly state the harmonization status of first-ownership of *economic* rights |

**EU harmonization caveat (load-bearing, do not skip):** the EU does **not** have a single directive stating "the author is the first owner of copyright" the way the US/UK/Taiwan/Japan statutes do. First ownership of copyright for most work categories remains governed by **national law** in each member state (this is the well-established, widely-documented structure of EU copyright architecture — narrow EU-level ownership rules exist only for specific categories, e.g. computer programs and databases, neither relevant here). What **is** verified at EU level is: (a) the *scope* of exclusive rights is harmonized, and (b) the *license-vs-assignment* distinction is explicitly drawn in EU legislative text itself (2006/115/EC).

**EU classification:** Prop A **PARTIALLY SUPPORTED** (rights-scope harmonization is consistent with the distinction; existence/subsistence itself is not stated in one clean EU-level provision the way US/UK/TW/JP state it — it flows from the combination of Berne-derived national implementing law across member states, which this research did not individually verify state-by-state). Prop B **PARTIALLY SUPPORTED** for the same reason, but the license-vs-assignment distinction itself is directly EU-sourced and strong. License-vs-assignment **SUPPORTED**.

## Taiwan — primary authority (Laws & Regulations Database of the ROC, law.moj.gov.tw, verified live, 2026-08-17)

| Provision | Original Chinese | English | Supports |
|---|---|---|---|
| Copyright Act (著作權法) Art. 10 | "著作人於著作完成時享有著作權。但本法另有規定者，從其規定。" | "The author of a work shall enjoy copyright upon completion of the work." | **Prop A** — automatic, statutory, creation-based |
| Art. 36 (讓與, assignment) | "著作財產權得全部或部分讓與他人或與他人共有。著作財產權之受讓人，在其受讓範圍內，取得著作財產權。" | "Economic rights may be transferred in whole or in part to another person and may be jointly owned with other persons." | **Prop B / license-assignment distinction** — 讓與 (rang-yu, transfer/assignment) as its own defined mechanism |
| Art. 37 (授權, license/authorization) | "著作財產權人得授權他人利用著作，其授權利用之地域、時間、內容、利用方法或其他事項，依當事人之約定；其約定不明之部分，推定為未授權。" | "The economic-rights holder may license/authorize others to exploit the work; territory, term, content, method of exploitation, etc. are as agreed by the parties; anything unclear in the agreement is presumed NOT authorized." | 授權 (shou-quan, license/authorization) is a textually and conceptually distinct mechanism from 讓與 — notably narrower-construed by default ("presumed not authorized" for anything unclear), reinforcing that a license is a bounded grant, not an ownership transfer |

`著作財產權` (economic copyright) is itself terminologically distinct from `著作人格權` (moral rights, not researched here — out of scope). 讓與 and 授權 are never used interchangeably in the statute.

**Taiwan classification:** Prop A **SUPPORTED**. Prop B **SUPPORTED**. License-vs-assignment **SUPPORTED**.

## Japan — primary authority (Japanese Law Translation, Ministry of Justice, japaneselawtranslation.go.jp, verified live, 2026-08-17)

| Provision | Original Japanese | English (official translation) | Supports |
|---|---|---|---|
| Copyright Act (著作権法) Art. 17(2) | (not independently re-fetched in Japanese; English confirmed) | "Enjoyment of the moral rights of author and copyrights shall not be subject to any formality." | **Prop A** — Berne-derived automatic-protection principle, no registration/formality needed for copyright to exist |
| Art. 61(1) (譲渡, transfer) | "著作権は、譲渡することができる。" | "A copyright may be transferred." | **Prop B / license-assignment distinction** — 譲渡 (jōto, transfer) as a defined mechanism for the right itself |
| Art. 63(1)–(2) (許諾, authorization/license) | "著作権者は、その著作物の利用を許諾することができ、その許諾をした者は、その許諾の範囲内において、その著作物を利用する権利を有する。" | "The author may authorize another person to exploit his work... the authorization shall not be presumed to extend beyond the purpose for which it was granted." | 許諾 (kyodaku, authorization/license) is textually distinct from 譲渡 — a scope-bounded permission to exploit, not a transfer of the right itself; the licensee's right (利用する権利, "right to exploit") is explicitly a right *arising from* the authorization, not identical to the author's own transferable 著作権 |

**Japan classification:** Prop A **SUPPORTED**. Prop B **SUPPORTED**. License-vs-assignment **SUPPORTED**.

## Comparative table

| Jurisdiction | Prop A (permission ≠ existence) | Prop B (permission ≠ ownership) | License ≠ Assignment | Primary authority | Implication for COPY-004 |
|---|---|---|---|---|---|
| United States (baseline, confirmed not reopened) | SUPPORTED | SUPPORTED | SUPPORTED | 17 U.S.C. §§101, 102, 201, 202, 204 | Fully hardened |
| United Kingdom | SUPPORTED | SUPPORTED | SUPPORTED | CDPA 1988 ss.1, 11, 90 | Fully hardened |
| European Union | PARTIALLY SUPPORTED | PARTIALLY SUPPORTED | SUPPORTED | Directives 2001/29/EC, 2006/115/EC | Structural distinction confirmed at EU level; first-ownership itself is a national-law question the EU directives don't resolve directly |
| Taiwan | SUPPORTED | SUPPORTED | SUPPORTED | Copyright Act (著作權法) Arts. 10, 36, 37 | Fully hardened |
| Japan | SUPPORTED | SUPPORTED | SUPPORTED | Copyright Act (著作権法) Arts. 17, 61, 63 | Fully hardened |

## Contrary-evidence search (genuine, documented, per task §19)

Searched specifically for: jurisdictions/doctrines where a commercial-use license itself creates or transfers copyright ownership. **No contrary jurisdiction or doctrine was found.** One genuine, relevant precision point surfaced (not a contradiction, a refinement): under the U.S. §101 definition, an **exclusive** license (as opposed to the nonexclusive license standard consumer/commercial AI-platform Terms actually grant — confirmed by the Runway/ElevenLabs language in Part 1) legally *does* count as a "transfer of copyright ownership." COPY-004's "commercial-use permission" framing is accurate specifically because verified real-world platform grants are nonexclusive; the "doesn't by itself answer" hedge would need re-examination only in the unusual case of a contract granting something broader than ordinary commercial-use permission (e.g., an actual exclusive license or explicit assignment) — a scenario the existing wording's "by itself" qualifier already anticipates without needing to name it.

## Global-scope decision test (task §17 criteria)

- **A. Structural to the legal concepts themselves?** Yes — license/permission vs. ownership-transfer is a foundational distinction independently present in every system checked, expressed through different statutory mechanisms (§101/§204 in the US; s.90 in the UK; 2006/115/EC Art. 3(3) in the EU; Arts. 36/37 in Taiwan; Arts. 61/63 in Japan) but never absent.
- **B. Independently preserved by materially different systems?** Yes — one common-law system (UK), one supranational/civil-law-influenced system (EU), and two distinct East Asian systems (Taiwan, Japan) all draw the same line, verified independently in each system's own primary text.
- **C. No contrary jurisdictional model identified?** Confirmed, via a genuine documented search (above).
- **D. Is COPY-004 phrased abstractly enough to avoid importing U.S.-specific doctrine?** Yes — the existing wording ("a platform granting commercial-use permission doesn't by itself answer either") names no statute, no jurisdiction-specific mechanism, and no U.S.-specific term of art.
- **E. Does the claim avoid stating any jurisdiction's detailed substantive rule?** Yes — it states only the structural relationship, never a specific copyrightability/ownership outcome.

**All five criteria are satisfied for the *structural* proposition.** The one qualification: EU-level authority alone does not, by itself, harmonize *first ownership*, so "Global" is best understood — see the recommended interpretation below — as "jurisdiction-neutral structural framing," not "SI8 has verified the detailed ownership rule in every jurisdiction," and the EU finding is the concrete reason that distinction matters rather than being a formality.

## Recommended meaning of "Global"

No existing LK documentation defines "Global" as a jurisdiction value with any more precision than the plain word itself (checked: `GOVERNED-CLAIMS.md`, `TOPIC-RELATIONSHIPS.md`, `08_Platform/app/lib/retrieval-engine/types.ts`'s own `TopicClaim.jurisdiction` field, which is free text, not an enum). Recommend PM adopt, as an explicit governance convention (documentation only, no schema change): **"Global" on a claim means the claim states a jurisdiction-*neutral structural relationship* between legal concepts, pressure-tested across materially different legal systems, not a claim that the detailed substantive rule has been verified in every jurisdiction worldwide.** This reading is fully compatible with what this research actually supports for COPY-004 and would NOT be compatible with, e.g., a hypothetical claim asserting a specific copyrightability outcome as "Global" (that kind of claim should always be jurisdiction-scoped, per the existing COPY-001/002/003 model).

## Implications for COPY-001/002/003 (analysis only — those claims are not touched here)

This research reinforces, rather than undermines, the existing architectural split: COPY-004 is a genuinely jurisdiction-neutral *structural* claim (license ≠ ownership, permission ≠ existence), while COPY-001/002/003's substantive human-authorship/copyrightability rules are correctly scoped `Jurisdiction: United States (federal)` and gated by `applicability_requirements`, because *those* propositions are NOT structural — they state a specific, non-universal substantive legal conclusion (e.g., "prompting alone is insufficient authorship" reflects specific USCO guidance, not a universal structural truth every jurisdiction necessarily shares in the same form). This comparative pass did not test COPY-001/002/003's substance and recommends none of it be extended to other jurisdictions without dedicated jurisdiction-by-jurisdiction research of its own.

## Governed-synthesis architecture note (for the future LK backlog — documentation only, no schema change)

This comparative pass sharpens a distinction worth recording for future Living Knowledge design: a **governed synthesis's own jurisdiction/scope metadata may need to be evaluated at a different grain than the claim's substantive content**. COPY-004's synthesis rests on five-jurisdiction-verified *structural* support, while its constituent source propositions are jurisdiction-specific statutes. A future schema refinement *could* distinguish "scope of the synthesis conclusion" from "scope of each source proposition" explicitly — flagged as a backlog idea only, not implemented or specified here.

## Source-monitoring recommendation (report only, not implemented)

**Low-change tier** (stable statutes, appropriate for infrequent/no monitoring): 17 U.S.C. §§101/102/201/202/204; CDPA 1988 ss.1/11/90; Taiwan Copyright Act Arts. 10/36/37; Japan Copyright Act Arts. 17/61/63; EU Directives 2001/29/EC and 2006/115/EC.
**Higher-change tier** (already recommended in Part 1): Runway and ElevenLabs Terms of Use specifically, since platform contract language changes far more often than statutes.

## What Part 2 is NOT

Not exhaustive comparative law (five jurisdictions only, deliberately). Not research into AI-generated-work copyrightability in any of the four new jurisdictions. Not a recommendation to keep "Global" without PM adopting the recommended explicit meaning above. Not independent legal advice.

# Issue 01 · State of Enterprise Tech in Regulated Industries — 2026

*A welcome and a thesis.*

---

If you're reading this in your inbox, thank you. The promise is one
substantive email a month — and to mean it, the first issue has to
actually be substantive.

So: rather than spend it on a welcome, let me share the practitioner
read I've been writing up across 2026 — the one finding pattern that
keeps recurring across every regulated-industry engagement I sit in.

## The pattern: it's the substrate, not the discipline.

Four functions inside most enterprises:

1. Enterprise architecture (CTO or chief architect)
2. Platform engineering & DevSecOps (VP Engineering or CISO)
3. Data modernisation (CDO)
4. Applied GenAI (new Chief AI Officer or AI Centre of Excellence)

Each is staffed by good people. Each delivers honestly inside its
own scope. And in most enterprises, almost no compound emerges
between them.

The reason isn't competence. It's that the work that compounds — the
*substrate* — lives in the seam between the four. No single function
owns the substrate. Each builds its half; the halves never meet.

What's the substrate? In 2026, roughly five capabilities:

- **Identity** — workload identity (OIDC, SPIFFE) as the universal
  authn primitive across services, data, AI.
- **Observability** — OpenTelemetry as the universal instrumentation,
  spanning from a Terraform module to an LLM inference call.
- **Policy** — policy-as-code (OPA / Kyverno) enforced at deploy.
  Architecture principles written as policies, not as PDFs.
- **Audit evidence** — per-decision evidence packs generated at decision
  time, signed, retention-controlled.
- **Data lineage** — catalogued data with owners, freshness, residency.
  Consumable by AI, BI, ops alike.

The 12% of enterprises that shipped GenAI to real customers in 2026
all share one thing: they built this substrate first. The other 88%
built use-cases first and are now retrofitting controls under EU AI
Act pressure (high-risk obligations enforceable from 2 August 2026).

## Why I'm writing about it

I just published the [first edition](https://hellouchit.com/state-of-2026/)
of an annual report on this — the **State of Enterprise Tech in
Regulated Industries, 2026** — with ten findings, each anchored in
cited public evidence (DORA 2024, Menlo Ventures State of GenAI 2024,
FinOps State of FinOps 2024, Verizon DBIR 2024, BSIMM, regulatory
primary sources). It takes ~15 minutes to read.

Three findings I'd flag from it specifically:

- **Supply chain replaced AppSec as the highest-leverage 2026 security
  work.** Post-XZ Utils, post-Snowflake, post-CrowdStrike — none of
  these were findings on a SAST report. They were workload-identity,
  provenance and SBOM-to-owner failures. The vendor markets haven't
  caught up. [Read the full essay →](https://hellouchit.com/writing/devsecops-is-supply-chain.html)

- **Platform engineering became the AI delivery moat.** Orgs whose
  paved paths already encoded identity, observability and policy can
  ship AI features in days. Orgs whose AI Centre of Excellence runs
  parallel to platform engineering ship in months and stall.
  [Read the full essay →](https://hellouchit.com/writing/platform-engineering-ai-moat.html)

- **Australia's regulatory clock advanced faster than most boards
  noticed.** APRA CPS 230 (eff. 1 Jul 2025), DISR AI Safety Standard
  (Sep 2024, mandatory signposted), DTA AI Policy (1 Sep 2024), EU
  DORA reaching AU subsidiaries from Jan 2025. By mid-2027 the
  regulatory floor will be substantially harder than 2024 — with
  limited extra budget.

## What this newsletter is

One thoughtful email a month. Substantive, cited, no marketing. New
writing where I have it; deep notes on what's shipping (and not)
across the four disciplines that actually compound.

You can also follow on:
- RSS → <https://hellouchit.com/writing/feed.xml>
- LinkedIn → <https://www.linkedin.com/in/uchitvyas/>
- Open source → <https://github.com/uchit/opa-nist-ai-rmf> (OPA policy
  bundle enforcing NIST AI RMF + EU AI Act controls)

## What I'd love from you back

If one of the findings in the State of 2026 maps to something you're
seeing in your own organisation — or contradicts it — reply to this
email. The annual report is v1.0 and will compound by being read by
practitioners who push back.

Thank you for the first read.

— Uchit
Melbourne, AU
[hellouchit.com](https://hellouchit.com/)

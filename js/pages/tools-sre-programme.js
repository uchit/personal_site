
window.addEventListener("DOMContentLoaded", function () {
  const SREBOOK = "https://sre.google/sre-book/table-of-contents/";
  const SREWORK = "https://sre.google/workbook/table-of-contents/";
  const DORA = "https://dora.community/research/2024/";
  const ISO20K = "https://www.iso.org/standard/70636.html";
  const NIST160 = "https://csrc.nist.gov/publications/detail/sp/800-160/vol-2-rev-1/final";
  const OTEL = "https://opentelemetry.io/";
  const CHAOS = "https://principlesofchaos.org/";

  Diag.run({
    sectors: {
      tech:{label:"Tech / SaaS", lens:"For SaaS, SRE is the difference between SLA credits and customer retention. Customers see your status page; investors see your incident postmortems. <b>SLOs</b>, <b>error budgets</b> and <b>postmortems</b> are differentiators."},
      fsi:{label:"Financial services", lens:"In FSI, <a href='https://www.apra.gov.au/sites/default/files/cps_230_-_operational_risk_management_-_july_2023.pdf' target='_blank' rel='noopener'>APRA CPS 230</a> + EU DORA require operational-resilience evidence: documented runbooks, tested chaos, tracked MTTR. <b>Blast radius</b>, <b>runbooks</b> and <b>chaos / game-days</b> are auditable controls."},
      government:{label:"Government", lens:"For Aus gov, ISM PROTECT incident-response controls + agency BCP. <b>Postmortems</b>, <b>capacity planning</b> and <b>golden signals</b> all attract scrutiny."},
      healthcare:{label:"Healthcare", lens:"For health, outages affect patient care. <b>Blast radius</b> (clinical vs corporate isolation) and <b>runbooks</b> are clinically critical. <b>Chaos engineering</b> is bounded by patient safety."},
      retail:{label:"Retail", lens:"For retail, peak-event SRE is its own discipline (war rooms, game-days, capacity stress tests). <b>Capacity planning</b> and <b>chaos</b> are peak-event prerequisites."},
      critinfra:{label:"Critical infra", lens:"In critical infrastructure, resilience is regulator-tracked (<a href='https://www.cisc.gov.au/' target='_blank' rel='noopener'>SOCI Act RMP</a>, NERC CIP). <b>Blast radius</b>, <b>runbooks</b>, <b>chaos</b> and <b>postmortems</b> are statutory."}
    },

    questions: [
      { cap:"SLOs / SLIs", t:"Do your services have SLOs that match what users experience?",
        refs:[{name:"Google SRE Workbook Ch.2",url:SREWORK},{name:"NIST SP 800-160 V2 §3.2",url:NIST160}],
        o:["No SLOs — uptime is the proxy.","SLOs on some services; measured from infra, not user journey.","User-journey SLOs on critical services; reviewed quarterly.","SLOs on every customer-facing service; alerted against, owned by squad.","SLOs are the contract — used in trade-off decisions; SLIs measured from the user's perspective."] },
      { cap:"Error budgets", t:"What happens when a service burns its error budget?",
        refs:[{name:"Google SRE Workbook Ch.3",url:SREWORK}],
        o:["Nothing — error budgets are an idea, not a practice.","We discuss; rarely act.","Engineering slows feature work until burn rate recovers.","Budget burn auto-pauses risky changes; reliability work prioritised.","Error budget is enforced by policy — feature freeze or change-velocity reduction is automatic."] },
      { cap:"Blast radius", t:"When something fails, how contained is it?",
        refs:[{name:"AWS Cell-based architecture",url:"https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-fault-isolation/reducing-scope-of-impact-with-fault-isolation.html"},{name:"NIST SP 800-160 V2 §3.3",url:NIST160}],
        o:["A failure in one place can take down the whole platform.","Some isolation; not consistently applied.","Most services isolated by region / cell / tenant.","Cell-based architecture for critical paths; blast-radius known and rehearsed.","Blast-radius is a first-class design constraint — every new service ships with a documented blast-radius and rehearsal."] },
      { cap:"On-call hygiene", t:"What's on-call like to be on?",
        refs:[{name:"Google SRE Book Ch.11",url:SREBOOK},{name:"PagerDuty Ops Report",url:"https://www.pagerduty.com/state-of-digital-operations/"}],
        o:["Brutal. People dread it. Burnout drives turnover.","Survivable but noisy. Many alerts are noise.","Manageable. Some good runbooks; mostly actionable alerts.","Healthy. Pager load tracked; tuning happens; on-call comp pays for itself.","Pager load is a tracked KPI. Anything above threshold triggers reliability work, not toughness."] },
      { cap:"Postmortems", t:"What happens after an incident?",
        refs:[{name:"Google SRE Book Ch.15",url:SREBOOK},{name:"Etsy Debriefing Facilitator's Guide",url:"https://extfiles.etsy.com/DebriefingFacilitationGuide.pdf"}],
        o:["Blame and finger-pointing; we move on.","A doc gets written; rarely read.","Blameless postmortems; action items tracked.","Action items closed within SLA; trends reviewed quarterly.","Postmortems drive platform changes; recurrence rate of past failure modes is a tracked KPI."] },
      { cap:"Runbooks", t:"When a new on-call gets paged at 3am, do they have what they need?",
        refs:[{name:"Google SRE Workbook Ch.12",url:SREWORK}],
        o:["A wiki link that doesn't work.","An outdated runbook from someone who left.","Runbooks exist; quality varies by service.","Runbooks per service; tested in game-days; updated after each incident.","Runbooks are living artefacts — linked from alerts, tested quarterly, deprecated when irrelevant."] },
      { cap:"Chaos / game-days", t:"Do you actively test resilience?",
        refs:[{name:"Principles of Chaos Engineering",url:CHAOS},{name:"Netflix Chaos Monkey",url:"https://netflixtechblog.com/the-netflix-simian-army-16e57fbab116"}],
        o:["No — we hope failure scenarios are rare.","Occasional game-days when leadership pushes.","Quarterly game-days for critical services.","Continuous chaos engineering — failure injection in pre-prod, planned in prod.","Chaos is integrated — every new service ships with a 'how does this fail?' test as part of CI."] },
      { cap:"Capacity planning", t:"How do you decide when to scale?",
        refs:[{name:"Google SRE Book Ch.18",url:SREBOOK}],
        o:["When something breaks.","Reactively, when monitoring screams.","Capacity reviewed quarterly; rough headroom targets.","Capacity modelled per service; auto-scaling tuned; load tests inform.","Capacity is a tracked SLO — headroom, growth, cost trade-off reviewed monthly with owners."] },
      { cap:"Toil tracking", t:"Do you know how much repetitive operational work the team does?",
        refs:[{name:"Google SRE Book Ch.5",url:SREBOOK}],
        o:["No — toil is invisible.","Anecdotally; the team complains.","Toil is named; some tracking; engineering allocates time to reduce it.","Toil tracked per quarter; <50% target; investment in automation funded.","Toil is a primary metric — reductions reported alongside features; team capacity model accounts for it."] },
      { cap:"Golden signals", t:"Do all your critical services expose the four golden signals (latency, traffic, errors, saturation)?",
        refs:[{name:"Google SRE Book Ch.6",url:SREBOOK},{name:"OpenTelemetry",url:OTEL}],
        o:["Inconsistent — some services have rich telemetry; others have nothing.","Most have some; quality varies.","Golden signals on critical paths; dashboards exist.","Inherited from the platform template; default dashboards per service.","Golden signals are a platform contract — every service has them, every alert references them, every postmortem cites them."] }
    ],

    levels: [
      { minPct:0, maxPct:0.2, name:"Heroic",
        benchmark:'<cite><a href="https://dora.community/research/2024/" target="_blank" rel="noopener">DORA 2024</a></cite>: bottom-cluster MTTR &gt; 24h, change-fail rate &gt; 45%. Pager-load typically 5-10&times; sustainable threshold (<a href="https://www.pagerduty.com/state-of-digital-operations/" target="_blank" rel="noopener">PagerDuty data</a>).',
        body:"<b>Reliability depends on individuals.</b> Pager load is high; turnover follows; institutional knowledge walks. The first lever is reducing noise — make alerts mean something, and on-call rotations become survivable.",
        recs:[
          { what:"Audit the last month of alerts. Mute, delete or fix the noisy ones. Aim for >70% actionable.",
            why:"Alert fatigue is the leading cause of on-call burnout. PagerDuty data shows actionable rate is the strongest predictor of incident response.",
            tools:"Datadog / Grafana alert hygiene reports · PagerDuty Analytics · Squadcast",
            constraint:"Muting alerts requires confidence they won't matter &mdash; pair with on-call reviews.",
            refs:[{name:"PagerDuty State of Digital Ops",url:"https://www.pagerduty.com/state-of-digital-operations/"}] },
          { what:"Pick one critical service. Define one SLO from the user's journey. Alert on burn rate, not infra.",
            why:"User-journey SLOs change behaviour; infra metrics rarely do. <a href='https://sre.google/workbook/alerting-on-slos/' target='_blank' rel='noopener'>Google SRE: Alerting on SLOs</a> is the canonical pattern.",
            tools:"Prometheus + Grafana · Datadog SLOs · Honeycomb · Nobl9 · Lightstep",
            constraint:"Defining the user journey requires product partnership.",
            refs:[{name:"Google SRE Workbook Ch.5",url:SREWORK}] },
          { what:"Run one blameless postmortem on the next incident. Don't ask 'who'; ask 'what about the system?'.",
            why:"<a href='https://extfiles.etsy.com/DebriefingFacilitationGuide.pdf' target='_blank' rel='noopener'>Etsy's Debriefing Facilitator's Guide</a> is the canonical instrument. Sets a cultural floor.",
            tools:"Internal postmortem template · facilitated by a third party first time",
            constraint:"Requires leadership commitment not to punish honest reporting.",
            refs:[{name:"Google SRE Book Ch.15",url:SREBOOK}] }
        ] },
      { minPct:0.2001, maxPct:0.4, name:"Operational",
        benchmark:'DORA "Medium" cluster: MTTR hours to a day; change-fail 16-30%. Practices exist; rigour is inconsistent.',
        body:"<b>You have practices, but not yet discipline.</b> The win is making error budgets real — a number that actually changes what the team does next.",
        recs:[
          { what:"Define error budgets for the top three services. Agree what 'budget exhausted' triggers.",
            why:"<a href='https://sre.google/workbook/error-budget-policy/' target='_blank' rel='noopener'>Google SRE: Error Budget Policy</a> is the canonical template.",
            tools:"Nobl9 · Datadog SLOs · OpenSLO · internal policy doc",
            constraint:"Product partnership essential &mdash; freezing features without their buy-in fails.",
            refs:[{name:"Error Budget Policy",url:"https://sre.google/workbook/error-budget-policy/"}] },
          { what:"Track toil. Aim for <50% of team time. Fund the automation that gets you there.",
            why:"<a href='https://sre.google/sre-book/eliminating-toil/' target='_blank' rel='noopener'>Google SRE: Eliminating Toil</a> &mdash; the canonical 50% bound.",
            tools:"Internal toil tracker · sprint-level categorisation · annual toil survey",
            constraint:"Toil definition is contested &mdash; agree the taxonomy first.",
            refs:[{name:"Google SRE Book Ch.5",url:SREBOOK}] },
          { what:"Build runbooks for the top 10 alert types. Test one in a game-day this quarter.",
            why:"Tested runbooks beat written runbooks. <a href='https://sre.google/workbook/postmortem-culture/' target='_blank' rel='noopener'>Google SRE</a> identifies runbook testing as a defining mature-team practice.",
            tools:"In-repo runbooks (Markdown) · Notion/Confluence · automated runbook execution (Fabric, Rundeck)",
            constraint:"Runbooks decay &mdash; assign ownership for refresh.",
            refs:[{name:"Google SRE Workbook Ch.12",url:SREWORK}] }
        ] },
      { minPct:0.4001, maxPct:0.6, name:"Disciplined",
        benchmark:'DORA "High" cluster: MTTR &lt; 1 day; change-fail &lt; 16%; deploy weekly. SLOs and postmortems are routine.',
        body:"<b>You have a real SRE programme.</b> SLOs, postmortems, runbooks all exist; the jump is from 'practice' to 'platform' &mdash; golden signals inherited by default, blast-radius as a design constraint, chaos engineering as a habit.",
        recs:[
          { what:"Make golden signals inherited by every new service. Stop relying on teams to remember.",
            why:"Inherited defaults dominate opted-in practice in adoption data.",
            tools:"OpenTelemetry default instrumentation · platform template wiring · Grafana dashboards from labels",
            constraint:"Legacy services need migration plan; start with new builds.",
            refs:[{name:"Google SRE Book Ch.6",url:SREBOOK},{name:"OpenTelemetry",url:OTEL}] },
          { what:"Adopt cell-based / region-isolated architecture for at least the top two services. Rehearse blast-radius.",
            why:"<a href='https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-fault-isolation/reducing-scope-of-impact-with-fault-isolation.html' target='_blank' rel='noopener'>AWS guidance on cell-based architecture</a> is the canonical pattern.",
            tools:"AWS cell-based architecture · multi-tenant cell routers · NIST SP 800-160 V2 patterns",
            constraint:"Cell isolation has cost overhead (1.4-1.8&times;) &mdash; design tier accordingly.",
            refs:[{name:"AWS WAF Cell-based",url:"https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-fault-isolation/reducing-scope-of-impact-with-fault-isolation.html"}] },
          { what:"Run quarterly game-days. Make failure rehearsal as normal as code review.",
            why:"<a href='https://principlesofchaos.org/' target='_blank' rel='noopener'>Principles of Chaos</a> applies to availability the way pen-tests apply to security.",
            tools:"Gremlin · Chaos Mesh · LitmusChaos · AWS FIS · internal game-day cadence",
            constraint:"Production-safe chaos needs co-design with platform &amp; security.",
            refs:[{name:"Principles of Chaos",url:CHAOS}] }
        ] },
      { minPct:0.6001, maxPct:0.8, name:"Engineered",
        benchmark:'DORA "Elite" cluster: deploy multi-daily; MTTR &lt; 1 hour; change-fail &lt; 5%. Top quartile globally.',
        body:"<b>Reliability is engineered, not heroic.</b> The remaining gap is usually toil and capacity discipline &mdash; keeping ops investment honest as scale grows.",
        recs:[
          { what:"Set a quarterly toil-reduction target. Report it alongside feature delivery.",
            why:"Toil reduction reported as a feature is what protects platform-engineering investment.",
            tools:"Internal toil dashboard + platform roadmap",
            constraint:"Reduction requires investment; trade-off transparent with leadership.",
            refs:[{name:"Google SRE Book Ch.5",url:SREBOOK}] },
          { what:"Make capacity planning data-driven — headroom, growth, cost — owned by service teams, reviewed monthly.",
            why:"Centralised capacity planning becomes a bottleneck; teams own the trade-off.",
            tools:"Internal capacity dashboards + cost feed · Auto-scaling policies as code",
            constraint:"Requires teams to predict growth &mdash; partner with product on forecasts.",
            refs:[{name:"Google SRE Book Ch.18",url:SREBOOK}] },
          { what:"Move chaos from quarterly to continuous in pre-prod, planned in prod.",
            why:"Quarterly chaos misses drift between cycles; continuous catches it.",
            tools:"AWS FIS · Gremlin · Chaos Mesh · LitmusChaos · internal failure injection in CI",
            constraint:"Continuous prod chaos requires mature on-call &amp; blast-radius discipline.",
            refs:[{name:"Principles of Chaos",url:CHAOS}] }
        ] },
      { minPct:0.8001, maxPct:1.0, name:"Property",
        benchmark:'Sub-<b>2%</b> of orgs. Reliability is a platform property. Reference customers for SRE platforms. Published incident reports build trust.',
        body:"<b>Reliability is a property of how you build.</b> Pager is calm; budgets are real; failure modes are rehearsed; toil is named and shrinking. The work now is regression discipline as AI workloads, regulatory shifts and platform changes try to erode it.",
        recs:[
          { what:"Add AI-workload SLOs (cost-per-outcome, latency, accuracy) before squads invent their own.",
            why:"AI workload reliability is not just availability &mdash; quality and cost are co-equal SLO axes.",
            tools:"Internal AI-SLO definitions · LangSmith / Arize Phoenix production metrics · OpenTelemetry GenAI semconv",
            constraint:"Frameworks for AI SLOs still maturing &mdash; expect quarterly refresh.",
            refs:[{name:"OTel GenAI conventions",url:"https://opentelemetry.io/docs/specs/semconv/gen-ai/"}] },
          { what:"Run quarterly resilience-debt reviews — what failure modes have we not yet rehearsed?",
            why:"Resilience debt accumulates silently; reviews surface it.",
            tools:"Internal review cadence + chaos catalog + ATT&CK-style failure-mode register",
            constraint:"Reviews need cross-functional sponsors to act on findings.",
            refs:[{name:"NIST SP 800-160 V2",url:NIST160}] },
          { what:"Externalise your SRE operating model. Recruit the next ten SREs.",
            why:"SRE talent is scarce; published practice attracts.",
            tools:"Conference talks (SREcon) · public postmortems · open-sourced internal tooling",
            constraint:"Legal review of public artefacts slows cadence.",
            refs:[{name:"SREcon",url:"https://www.usenix.org/srecon"}] }
        ] }
    ],

    references: [
      { domain:"Framework", name:"Google SRE Book (1st edition)",     desc:"The foundational SRE text. SLOs, error budgets, postmortems, capacity planning.", url:SREBOOK },
      { domain:"Framework", name:"Google SRE Workbook (2nd)",          desc:"Practical companion: alerting, incident response, on-call.", url:SREWORK },
      { domain:"Standard",  name:"ISO/IEC 20000-1:2018",               desc:"International service-management standard. The audit-readable version of SRE for regulated industries.", url:ISO20K },
      { domain:"Standard",  name:"NIST SP 800-160 V2 Rev 1 (Systems Security &amp; Resilience)", desc:"NIST guidance on systems resilience engineering.", url:NIST160 },
      { domain:"Benchmark", name:"DORA Accelerate State of DevOps 2024", desc:"Reference dataset for delivery + reliability benchmarking.", url:DORA },
      { domain:"Benchmark", name:"PagerDuty State of Digital Operations", desc:"Annual operational-metrics data: pager-load, MTTR, response rates.", url:"https://www.pagerduty.com/state-of-digital-operations/" },
      { domain:"Practice",  name:"Principles of Chaos Engineering",     desc:"The canonical short doc. Apply chaos with discipline.", url:CHAOS },
      { domain:"Practice",  name:"Etsy Debriefing Facilitator's Guide", desc:"Practitioner-grade postmortem facilitation guide. Free, applied, tested.", url:"https://extfiles.etsy.com/DebriefingFacilitationGuide.pdf" },
      { domain:"Tooling",   name:"OpenTelemetry",                      desc:"CNCF graduated observability standard. The substrate for golden signals.", url:OTEL },
      { domain:"Tooling",   name:"Nobl9 / OpenSLO",                    desc:"SLO-as-code platforms. Vendor + OSS equivalents for managing SLOs.", url:"https://www.nobl9.com/" },
      { domain:"Community", name:"SREcon (USENIX)",                    desc:"The reference community + conference for the practice.", url:"https://www.usenix.org/srecon" }
    ]
  });
});

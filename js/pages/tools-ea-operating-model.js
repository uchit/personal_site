
window.addEventListener("DOMContentLoaded", function () {
  const TOGAF = "https://www.opengroup.org/togaf";
  const BIAN = "https://bian.org/";
  const ARCHIMATE = "https://www.opengroup.org/archimate-forum/archimate-overview";
  const ADR = "https://adr.github.io/";
  const BIZBOK = "https://www.bizbok.org/";
  const GARTNER_COMP = "https://www.gartner.com/en/information-technology/glossary/composable-business";

  Diag.run({
    sectors: {
      tech:{label:"Tech / SaaS", lens:"For tech, EA is increasingly outcome-led, lightweight, and embedded in product squads. <b>Federation</b> and <b>business linkage</b> matter; heavy TOGAF artefacts often don't. Watch for composable / API-first patterns."},
      fsi:{label:"Financial services", lens:"In FSI, <a href='https://bian.org/' target='_blank' rel='noopener'>BIAN</a>-aligned capability decomposition is the lingua franca for core modernisation. <a href='https://www.apra.gov.au/sites/default/files/cps_230_-_operational_risk_management_-_july_2023.pdf' target='_blank' rel='noopener'>APRA CPS 230</a> requires explicit operational-risk linkage from architecture decisions. <b>Decision capture</b> and <b>principle enforcement</b> are audited."},
      government:{label:"Government", lens:"Australian Gov: <a href='https://www.digital.gov.au/architecture-and-design' target='_blank' rel='noopener'>DTA Architecture &amp; Design</a> guidance. US: <a href='https://www.cio.gov/policies-and-priorities/federal-enterprise-architecture/' target='_blank' rel='noopener'>FEAF</a>. EA is investment governance &mdash; <b>capability model</b> and <b>business linkage</b> are mandatory."},
      healthcare:{label:"Healthcare", lens:"Healthcare EA must handle clinical-vs-corporate domain split + privacy. <a href='https://www.hl7.org/fhir/' target='_blank' rel='noopener'>HL7 FHIR</a> and HIMSS reference architectures drive integration. <b>Federation</b> and <b>capability model</b> are key."},
      retail:{label:"Retail", lens:"For retail, composable commerce (<a href='https://mach-alliance.org/' target='_blank' rel='noopener'>MACH Alliance</a>) replaced monolithic suites. <b>Target-state cadence</b> matters — retail tech moves quarterly."},
      critinfra:{label:"Critical infra", lens:"In critical infrastructure, EA includes safety + resilience-design constraints (<a href='https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards' target='_blank' rel='noopener'>IEC 62443</a>, <a href='https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx' target='_blank' rel='noopener'>NERC CIP</a> in US energy). <b>Principle enforcement</b> is operational risk."}
    },

    questions: [
      { cap:"Stance", t:"How does EA show up to a delivery team?",
        refs:[{name:"TOGAF Architecture Governance",url:TOGAF},{name:"Gartner: EA Operating Model",url:"https://www.gartner.com/en/information-technology/insights/enterprise-architecture"}],
        o:["As a gate at the end — engineers route around it.","As a review function whose output is opinions, not decisions.","As a consultancy — useful when invited; ignored when not.","As an enabling team — paves the path teams choose to use.","As a property of the platform — encoded in templates and policy; rarely felt directly."] },
      { cap:"Design authority", t:"Who decides architectural questions of scale?",
        refs:[{name:"TOGAF Architecture Board",url:TOGAF},{name:"APRA CPS 230 ¶31",url:"https://www.apra.gov.au/sites/default/files/cps_230_-_operational_risk_management_-_july_2023.pdf"}],
        o:["Whoever is loudest in the meeting.","A design-authority board that meets monthly and decides slowly.","Standing forum with documented terms of reference; decisions logged.","Tiered — local decisions stay local; cross-cutting go to a federated forum.","Most decisions are encoded — only genuinely new patterns escalate; everything else is paved."] },
      { cap:"Capability model", t:"Do you have a shared map of what your organisation does?",
        refs:[{name:"BIZBOK Capability Mapping",url:BIZBOK},{name:"BIAN Service Landscape",url:BIAN}],
        o:["No business capability model.","One exists; nobody uses it.","Capability model exists; consulted in major investment decisions.","Capability model drives the architecture roadmap and investment portfolio.","Capability model is a living artefact — investment, ownership, maturity per capability, refreshed regularly."] },
      { cap:"Target-state cadence", t:"How current is your target-state architecture?",
        refs:[{name:"TOGAF ADM",url:TOGAF},{name:"ArchiMate 3.2",url:ARCHIMATE}],
        o:["A PowerPoint from a few years ago.","Updated reactively when something major changes.","Refreshed annually; mostly aligned to current direction.","Quarterly refresh tied to portfolio reviews.","Continuously evolving artefact — versioned, diffable, source-of-truth for major investment decisions."] },
      { cap:"Principle enforcement", t:"How are architecture principles enforced?",
        refs:[{name:"TOGAF Architecture Principles",url:TOGAF},{name:"Open Policy Agent",url:"https://www.openpolicyagent.org/"}],
        o:["They live in a PDF nobody reads.","Mentioned in design reviews; selectively applied.","Cited in design reviews; documented exceptions tracked.","Most encoded as policy-as-code or platform defaults; exceptions need sign-off.","Principles you don't enforce don't exist — what's left is encoded, the rest were retired."] },
      { cap:"Decision capture", t:"When an architectural decision is made, where does it live?",
        refs:[{name:"ADR specification",url:ADR},{name:"Michael Nygard (originator)",url:"https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions"}],
        o:["In someone's head or an old email.","In Confluence somewhere; hard to find later.","ADRs (architecture decision records) per project, inconsistently used.","ADRs are standard; searchable; reviewed in design forums.","ADRs are first-class — required for changes above a threshold; consulted in postmortems and onboarding."] },
      { cap:"Federation", t:"How is EA organised vs delivery teams?",
        refs:[{name:"Team Topologies",url:"https://teamtopologies.com/"},{name:"Gartner: Federated EA",url:"https://www.gartner.com/en/information-technology/insights/enterprise-architecture"}],
        o:["Central tower — EA tells teams what to do.","Central function that occasionally consults delivery.","Central function + embedded architects in some streams.","Federated — domain architects in streams, central EA on cross-cutting concerns.","EA is mostly stream-aligned; the small central team owns cross-cutting standards, patterns and platform integration."] },
      { cap:"Business linkage", t:"Can you trace an architecture decision back to a business outcome?",
        refs:[{name:"BIZBOK Outcome Mgmt",url:BIZBOK},{name:"TOGAF Business Architecture",url:TOGAF}],
        o:["Architecture and business strategy are different documents.","Loose alignment; reviewed annually at a strategy offsite.","Architecture roadmap maps to business priorities at a portfolio level.","Per-capability investment ties to outcome metrics; reviewed quarterly.","Architecture is a lens on the business strategy — every major decision shows the outcome it serves."] }
    ],

    levels: [
      { minPct:0, maxPct:0.2, name:"Bureaucratic",
        benchmark:'<cite><a href="https://www.gartner.com/en/information-technology/insights/enterprise-architecture" target="_blank" rel="noopener">Gartner</a></cite>: <b>~30%</b> of EA functions are "documentation factories" with low business influence. Delivery teams route around them.',
        body:"<b>EA is a tax, not a service.</b> Delivery teams route around you; decisions get made twice; trust is the bottleneck. The single move that changes everything: ship one paved path that a real team actually adopts.",
        recs:[
          { what:"Pick one common need (say, a new microservice in cloud X). Build the paved path. Get a team to use it.",
            why:"Adoption beats prescription. The paved path is your case study.",
            tools:"Backstage Software Templates · internal Terraform/Helm modules · Cookiecutter",
            constraint:"First paved path takes 6-12 weeks. Sequence after a delivery quiet period.",
            refs:[{name:"CNCF Platform Eng Maturity",url:"https://tag-app-delivery.cncf.io/whitepapers/platform-eng-maturity-model/"}] },
          { what:"Move from approval to enablement. Replace 'no' reviews with 'here's the template' clinics.",
            why:"Approval queues breed resentment; clinics breed adoption.",
            tools:"Internal architecture clinic cadence · Office hours · ADR template",
            constraint:"Senior architects need to be available; resource accordingly.",
            refs:[{name:"TOGAF Architecture Governance",url:TOGAF}] },
          { what:"Write three ADRs for decisions already made. Make ADRs the unit of work, not slide decks.",
            why:"ADRs survive leadership change; decks die in shared drives.",
            tools:"<a href='https://adr.github.io/' target='_blank' rel='noopener'>ADR specification</a> · in-repo .md files · log4brains",
            constraint:"Retrospective ADRs feel artificial — write them anyway.",
            refs:[{name:"Michael Nygard's original",url:"https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions"}] }
        ] },
      { minPct:0.2001, maxPct:0.4, name:"Consultative",
        benchmark:'<b>~40%</b> of EA functions (Gartner). Helpful when invited; uneven across business units. Limited measurable outcome influence.',
        body:"<b>EA is helpful when asked.</b> The gap to influence is visibility — making the architecture story legible to people who aren't architects, and making the easy choice the architecture-aligned choice.",
        recs:[
          { what:"Publish your top 10 architecture principles. Encode the top 3 as policy-as-code or template defaults.",
            why:"Encoded principles travel further than documented ones.",
            tools:"<a href='https://www.openpolicyagent.org/' target='_blank' rel='noopener'>OPA</a> · <a href='https://kyverno.io/' target='_blank' rel='noopener'>Kyverno</a> · platform module defaults · ArchiMate principle modelling",
            constraint:"Picking the top 3 to encode is a political exercise; start with safety-critical.",
            refs:[{name:"TOGAF Architecture Principles",url:TOGAF}] },
          { what:"Federate. Place an architect in the two highest-value streams. Stop trying to scale from the centre.",
            why:"<a href='https://teamtopologies.com/' target='_blank' rel='noopener'>Team Topologies</a> identifies federation as the determinant of scaled EA influence.",
            tools:"Internal org redesign + embedded-architect role definition",
            constraint:"Central EA team must let go of decisions made in streams; this is hard.",
            refs:[{name:"Team Topologies",url:"https://teamtopologies.com/"}] },
          { what:"Build a one-page capability model. Use it in every investment conversation for the next quarter.",
            why:"<a href='https://www.bizbok.org/' target='_blank' rel='noopener'>BIZBOK</a>-style capability maps cut investment debates from days to hours.",
            tools:"BIZBOK template · ArchiMate Business Layer · Bizzdesign · LeanIX · Ardoq",
            constraint:"Capability model granularity is a fight — start coarse, refine later.",
            refs:[{name:"BIZBOK",url:BIZBOK}] }
        ] },
      { minPct:0.4001, maxPct:0.6, name:"Governed",
        benchmark:'<b>~20%</b> of EA functions (Gartner). Principles + ADRs + capability model exist and are used. Decision velocity improving.',
        body:"<b>You have a working EA function.</b> Principles, ADRs, capability model &mdash; they all exist. The next jump is from 'governed' to 'enabling' &mdash; encoding standards in platforms, not policies.",
        recs:[
          { what:"Move 3 more principles from 'policy doc' to 'enforced by platform'. Subtract the rest.",
            why:"What can't be encoded won't be enforced. Subtract what can't be enforced.",
            tools:"OPA · Kyverno · platform module enforcement · drift detection",
            constraint:"Encoding takes platform engineering effort &mdash; partner closely.",
            refs:[{name:"OPA Patterns",url:"https://www.openpolicyagent.org/docs/latest/policy-language/"}] },
          { what:"Tie capability investment to business outcome metrics. Stop reporting on architecture; start reporting on outcomes.",
            why:"Outcome reporting protects EA funding through reorgs.",
            tools:"BIZBOK + internal portfolio dashboard · LeanIX · Ardoq",
            constraint:"Outcome metrics require partnership with finance and product.",
            refs:[{name:"BIZBOK Outcome Management",url:BIZBOK}] },
          { what:"Make ADRs the source of truth for design reviews. Refuse to discuss decisions that aren't written down.",
            why:"Written decisions force clarity; verbal decisions get re-litigated.",
            tools:"ADR templates · in-repo .md · log4brains · adr-tools",
            constraint:"Cultural change — review chairs must enforce.",
            refs:[{name:"ADR specification",url:ADR}] }
        ] },
      { minPct:0.6001, maxPct:0.8, name:"Enabling",
        benchmark:'<b>~8%</b> of EA functions (Gartner). Embedded stream-aligned architects; encoded principles; tight business linkage. Reference customers for EA tools.',
        body:"<b>EA enables delivery rather than gating it.</b> Stream-aligned architects, encoded principles, tight business linkage. The remaining work is regression discipline &mdash; preventing the slow drift back to central gating.",
        recs:[
          { what:"Run a 'decisions we don't need to make' audit. Reduce the central queue.",
            why:"Most central-EA decisions should be local. Auditing surfaces what shouldn't be there.",
            tools:"Internal decision-volume tracking · ADR analysis",
            constraint:"Reducing central role threatens roles &mdash; needs leadership endorsement.",
            refs:[{name:"Team Topologies",url:"https://teamtopologies.com/"}] },
          { what:"Codify your operating model. Onboard one new architect against it. If it survives the first 90 days, it's real.",
            why:"Operating model survives leadership change only if documented and rehearsed.",
            tools:"Internal architecture playbook · onboarding programme · mentor cadence",
            constraint:"Documenting practice takes time; the people who do it best are the busiest.",
            refs:[{name:"TOGAF ADM",url:TOGAF}] },
          { what:"Tie a quarterly EA outcome to delivery metrics (lead time, change-fail, time-to-first-deploy).",
            why:"Reporting on artefacts is invisible; reporting on outcomes is unforgettable.",
            tools:"DORA metrics dashboard + capability outcome tracker",
            constraint:"Attribution is hard &mdash; partner with delivery on shared metrics.",
            refs:[{name:"DORA Accelerate 2024",url:"https://dora.community/research/2024/"}] }
        ] },
      { minPct:0.8001, maxPct:1.0, name:"Property",
        benchmark:'Sub-<b>3%</b> of EA functions (Gartner). Architecture is invisible because it works. Published case studies and conference talks.',
        body:"<b>Architecture is a property of how you build, not a function you consult.</b> The work now is staying out of the way as scale and AI workloads enter &mdash; and externalising the model so it survives leadership turnover.",
        recs:[
          { what:"Bake AI-workload patterns into the paved path before squads invent their own.",
            why:"GenAI defaults set at EA-level avoid 100 squads each rolling their own model-routing layer.",
            tools:"Internal AI architecture patterns · MCP server defaults · reference architecture",
            constraint:"AI patterns are evolving fast &mdash; expect quarterly refresh.",
            refs:[{name:"NIST AI RMF",url:"https://www.nist.gov/itl/ai-risk-management-framework"}] },
          { what:"Publish (sanitised) ADRs externally for the decisions you'd want competitors to copy.",
            why:"Externalising the practice recruits. The best architects in 2026 join orgs whose ADRs they've read.",
            tools:"Public ADR repo (GitHub) · conference talks · book chapters",
            constraint:"Legal review of every published ADR slows cadence.",
            refs:[{name:"OSS ADR examples",url:"https://github.com/joelparkerhenderson/architecture-decision-record"}] },
          { what:"Set a sunset cadence — every quarter, retire one standard that no longer earns its keep.",
            why:"Standards accumulate; without sunset, architecture becomes the bureaucracy it set out to replace.",
            tools:"Internal sunset RFC + standards register · LeanIX/Ardoq lifecycle field",
            constraint:"Sunsetting standards requires identifying who relies on them.",
            refs:[{name:"TOGAF Architecture Repository",url:TOGAF}] }
        ] }
    ],

    references: [
      { domain:"Framework", name:"TOGAF 10 (The Open Group)",       desc:"The most widely-adopted EA framework. ADM cycle, architecture repository, governance.", url:TOGAF },
      { domain:"Framework", name:"BIAN Service Landscape",            desc:"Banking Industry Architecture Network. The lingua franca of banking capability decomposition.", url:BIAN },
      { domain:"Framework", name:"ArchiMate 3.2",                     desc:"The Open Group modelling language for enterprise architecture. Tool-portable.", url:ARCHIMATE },
      { domain:"Framework", name:"BIZBOK",                            desc:"Business Architecture Body of Knowledge. The reference for capability-based planning.", url:BIZBOK },
      { domain:"Practice",  name:"ADR (Architecture Decision Records)", desc:"Lightweight, durable, searchable decision capture. Originated by Michael Nygard.", url:ADR },
      { domain:"Industry",  name:"Gartner Enterprise Architecture",    desc:"Long-running research on EA operating models and maturity.", url:"https://www.gartner.com/en/information-technology/insights/enterprise-architecture" },
      { domain:"Industry",  name:"MACH Alliance",                     desc:"Microservices · API-first · Cloud-native · Headless. The composable enterprise reference.", url:"https://mach-alliance.org/" },
      { domain:"Tooling",   name:"LeanIX / Ardoq / Bizzdesign",        desc:"EA repository and capability-management tooling.", url:"https://www.leanix.net/" },
      { domain:"Regulation",name:"APRA CPS 230",                      desc:"Names architecture and design as operational-risk concerns for Australian financial entities.", url:"https://www.apra.gov.au/sites/default/files/cps_230_-_operational_risk_management_-_july_2023.pdf" }
    ]
  });
});

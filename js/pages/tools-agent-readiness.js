
window.addEventListener("DOMContentLoaded", function () {
  const AIACT  = "https://artificialintelligenceact.eu/the-act/";
  const RMF    = "https://www.nist.gov/itl/ai-risk-management-framework";
  const ISO    = "https://www.iso.org/standard/81230.html";
  const OWASP  = "https://owasp.org/www-project-top-10-for-large-language-model-applications/";
  const ATLAS  = "https://atlas.mitre.org/";
  const CPS230 = "https://www.apra.gov.au/news-and-publications/apra-publishes-cps-230-operational-risk-management";
  const AUSTD  = "https://www.industry.gov.au/publications/voluntary-ai-safety-standard";
  const OTEL   = "https://opentelemetry.io/docs/specs/semconv/gen-ai/";
  const CONTROLS = "/agents/";

  Diag.run({
    sectors: {
      tech:{label:"Tech / SaaS", lens:"For SaaS, the agent is usually customer-facing before it is governed. <b>Tool authorisation</b> and <b>blast radius</b> are the two that bite first &mdash; an agent with a write-capable tool and no ceiling is a support incident with your logo on it. <a href='"+OWASP+"' target='_blank' rel='noopener'>OWASP LLM06 Excessive Agency</a> is the failure mode to read."},
      fsi:{label:"Financial services", lens:"In FSI the agent is a change to an operational process, which makes it <a href='"+CPS230+"' target='_blank' rel='noopener'>APRA CPS 230</a>'s problem. Expect to be asked which critical operation it touches, what the substitutability plan is, and to produce a <b>replayable trajectory</b> for a specific customer decision. <b>Human oversight</b> that is real, not a rubber stamp, is the scrutinised control."},
      government:{label:"Government", lens:"Public-sector deployments carry a transparency obligation the private sector does not. <b>Trajectory</b> and <b>provenance</b> matter most: an FOI request or an ombudsman review will ask how a specific decision was reached, and 'the model decided' is not an answer. Australia's <a href='"+AUSTD+"' target='_blank' rel='noopener'>Voluntary AI Safety Standard</a> is the current baseline."},
      healthcare:{label:"Healthcare", lens:"Clinical or clinical-adjacent agents inherit the whole medical-device conversation. <b>Human oversight</b> and <b>action reversibility</b> are not negotiable, and the approval record must show what evidence the clinician was shown &mdash; not merely that they clicked approve. Anything touching PHI needs the trajectory store treated as a PHI store."},
      retail:{label:"Retail", lens:"Retail agents act on orders, refunds and pricing &mdash; overwhelmingly irreversible actions against live systems. <b>Action reversibility</b> and <b>cost per outcome</b> are the two that decide whether this is a margin win or a slow leak. A refund agent with no delay window is a fraud surface."},
      critinfra:{label:"Critical infra", lens:"For critical infrastructure the question is not whether the agent is useful but whether it can be stopped. <b>Blast radius</b> with a kill switch tested <em>mid-run</em>, and hard segmentation between the agent's identity and any OT-adjacent control path. Autonomy levels should start at 'propose only' and earn their way up."}
    },

    questions: [
      { cap:"Identity", t:"What identity does the agent act under?",
        refs:[{name:"NIST AI RMF GOVERN",url:RMF},{name:"Control 01",url:CONTROLS}],
        o:["A human's credentials — usually whoever deployed it.",
           "A shared service account used by several agents or jobs.",
           "Its own service account, but with a long-lived static key.",
           "Its own federated workload identity; no static credentials in the execution path.",
           "Own federated identity, and a revocation test on record showing tool calls fail within one polling interval."] },

      { cap:"Autonomy level", t:"Is autonomy declared per action class, or per agent?",
        refs:[{name:"EU AI Act Art. 14",url:AIACT},{name:"ISO/IEC 42001",url:ISO}],
        o:["Not declared. The agent does what it can do.",
           "Described in a design doc; nothing enforces it.",
           "A register of action classes exists with levels assigned and an approver named.",
           "Levels are enforced at execution, not just documented.",
           "Enforced at execution and the level in force is recorded per run, so you can answer what it was allowed to do then."] },

      { cap:"Trajectory", t:"Can you replay a specific run from step N?",
        refs:[{name:"EU AI Act Art. 12 (record-keeping)",url:AIACT},{name:"OTel GenAI semconv",url:OTEL}],
        o:["Final output is logged. Nothing else.",
           "Prompts and responses logged; tool calls are not.",
           "Tool calls logged with arguments and results.",
           "Full run exported: assembled context, retrieved document IDs, every call, model and prompt version, tokens, cost, latency.",
           "All of that, and replay from an arbitrary step is a tested capability rather than a claim."] },

      { cap:"Injection defence", t:"Is retrieved and tool-returned content treated as data or as instructions?",
        refs:[{name:"OWASP LLM01",url:OWASP},{name:"MITRE ATLAS",url:ATLAS}],
        o:["Not considered. Retrieved text goes straight into the prompt.",
           "Direct user input is filtered; retrieved and tool-returned content is not.",
           "Some structural separation between instructions and data.",
           "Indirect injection red-teamed through retrieval paths as well as direct input.",
           "Every retrieval and tool-result path red-teamed on a schedule, with structural separation enforced and regression tests for known payloads."] },

      { cap:"Tool authorisation", t:"Where is the boundary on what the agent may do?",
        refs:[{name:"OWASP LLM06 Excessive Agency",url:OWASP},{name:"Control 05",url:CONTROLS}],
        o:["The system prompt tells it what not to do.",
           "A tool list exists, the same for every context and role.",
           "Tools scoped per role, defined in configuration.",
           "A policy engine outside the model authorises each invocation.",
           "Policy engine authorises each call and decision logs show allow and deny with a reason, exportable per role."] },

      { cap:"Human oversight", t:"What does approval of a consequential action actually involve?",
        refs:[{name:"EU AI Act Art. 14",url:AIACT},{name:"NIST AI RMF GOVERN-1.3",url:RMF}],
        o:["No approval step.",
           "An approve/reject button with the proposed action and nothing else.",
           "Approval shows the reasoning and the evidence the agent used.",
           "As above, and approvals are recorded with the named individual and their decision.",
           "All of that, plus the approval rate is monitored — sustained near 100% is treated as a finding, not a success."] },

      { cap:"Blast radius", t:"What stops a loop, and has it been tested mid-run?",
        refs:[{name:"APRA CPS 230",url:CPS230},{name:"Control 07",url:CONTROLS}],
        o:["Nothing. A loop runs until someone notices the bill.",
           "A step limit in code; no spend or rate ceiling.",
           "Step, spend and rate ceilings configured per agent.",
           "Ceilings configured and a kill switch exists.",
           "Kill switch tested stopping an agent mid-run, with the time from decision to stop recorded."] },

      { cap:"Reversibility", t:"How are irreversible actions handled?",
        refs:[{name:"APRA CPS 230",url:CPS230},{name:"ISO/IEC 42001",url:ISO}],
        o:["The agent calls whatever the tool does. Reversibility was never assessed.",
           "Known-dangerous actions are excluded from the tool list.",
           "Agent-invokable actions inventoried and classified reversible or not.",
           "Irreversible ones carry an approval gate or a delay window.",
           "Classified, gated, and the reversal mechanism is named and exercised for each — versioned store, compensating transaction or delay."] },

      { cap:"Provenance", t:"When one agent consumes another's output, can you trace the chain?",
        refs:[{name:"EU AI Act Art. 12",url:AIACT},{name:"Control 09",url:CONTROLS}],
        o:["Single agent only, or chains are not traced.",
           "Each agent logs its own run; the join across them is manual.",
           "Outputs carry the upstream run ID that produced them.",
           "For a given output, the full upstream chain including retrieved sources is retrievable.",
           "Full chain retrievable, and a corrected upstream input marks the downstream outputs that depended on it."] },

      { cap:"Cost per outcome", t:"What unit is agent cost measured in?",
        refs:[{name:"Control 10",url:CONTROLS},{name:"APRA CPS 230",url:CPS230}],
        o:["Not measured separately from the platform bill.",
           "Total tokens or total spend, unattributed.",
           "Cost per run, attributed to an agent.",
           "Cost per resolved task, attributed to the consuming feature.",
           "Cost per resolved task with failed-run cost tracked alongside it, so retries and fan-out are visible rather than absorbed."] }
    ],

    levels: [
      { minPct:0, maxPct:0.2, name:"Improvised",
        benchmark:'Typical of a first agent shipped by a capable team under time pressure. Nothing here is unusual &mdash; it is what happens when a demo becomes production without a boundary being drawn.',
        body:"<b>The agent works and nothing constrains it.</b> The gap is not sophistication; it is that no boundary has been drawn yet. Identity is the first move because almost everything else attaches to it &mdash; ceilings, authorisation and attribution all need something to attach to.",
        recs:[
          { what:"Give the agent its own workload identity. Stop it acting as the engineer who deployed it.",
            why:"Attribution is impossible and revocation becomes a personnel action while an agent runs as a human. This is not a new control &mdash; it is workload identity applied to a new kind of workload, and if you solved it for services you have most of the work done.",
            tools:"AWS IAM Roles for Service Accounts · GCP Workload Identity Federation · Azure Federated Credentials · SPIFFE/SPIRE",
            constraint:"Federation needs an identity provider the runtime can reach; air-gapped runtimes need a different answer.",
            refs:[{name:"NIST AI RMF",url:RMF}] },
          { what:"Put a step, spend and rate ceiling on the agent today, even if the numbers are guesses.",
            why:"A loop without a ceiling is a billing incident with a countdown. A wrong ceiling is recoverable; no ceiling is not.",
            tools:"Kubernetes ResourceQuota · provider spend alerts · framework-level max-iteration settings",
            constraint:"Ceilings set too low look like flakiness to users — instrument before you tighten.",
            refs:[{name:"Control 07",url:CONTROLS}] },
          { what:"Record the full trajectory of every run, not the final output.",
            why:"Logging the output is enough to debug a demo and nothing else. Everything downstream — provenance, cost per outcome, incident review — is a join over trajectories you did not keep.",
            tools:"OpenTelemetry GenAI semantic conventions · Langfuse · LangSmith · Phoenix",
            constraint:"Trajectories contain whatever the model saw, so the store inherits the data classification of the context.",
            refs:[{name:"OTel GenAI semconv",url:OTEL}] }
        ] },

      { minPct:0.2001, maxPct:0.4, name:"Contained",
        benchmark:'The agent has an identity and some limits. This is where most first-year deployments sit once someone has asked a hard question about them.',
        body:"<b>Boundaries exist, and the model is still trusted more than it should be.</b> The characteristic gap here is the system prompt doing security work. Instructions telling a model what it must not do are a suggestion; the tool registry is the boundary.",
        recs:[
          { what:"Move tool authorisation out of the prompt and into a policy engine outside the model.",
            why:"An agent can only do what its tools permit, so the tool list is the control. A prompt instruction is a probabilistic request; a deny in a policy engine is not.",
            tools:"OPA / Rego · Cedar · a tool-registry service scoped per role",
            constraint:"Per-invocation authorisation adds latency to every tool call — budget for it.",
            refs:[{name:"OWASP LLM06",url:OWASP}] },
          { what:"Declare an autonomy level per action class, not per agent.",
            why:"Autonomy is a property of each action, not of the agent. Propose-only for one class and act-freely for another is the normal shape, and a single agent-level setting cannot express it.",
            tools:"An action-class register in config, enforced at the execution boundary",
            constraint:"The register goes stale the moment a tool is added — tie it to the tool registry.",
            refs:[{name:"ISO/IEC 42001",url:ISO}] },
          { what:"Red-team indirect prompt injection through your retrieval and tool-result paths.",
            why:"Direct injection is widely tested. Indirect injection — through a retrieved document, a web page, a tool result — is where agents actually get compromised, because the payload arrives after the guardrail has run.",
            tools:"Garak · PyRIT · promptfoo · a corpus of known indirect payloads in CI",
            constraint:"A one-off exercise ages badly; this needs to be a regression suite, not an engagement.",
            refs:[{name:"MITRE ATLAS",url:ATLAS}] }
        ] },

      { minPct:0.4001, maxPct:0.6, name:"Supervised",
        benchmark:'Enforcement exists and a human is in the loop. This is roughly the bar the EU AI Act sets for a high-risk system, and the bar most organisations discover they are below during their first assessment.',
        body:"<b>The controls are real; the evidence is thin.</b> What separates this from the next level is almost entirely whether you can produce an artefact rather than describe a practice. Oversight in particular: an approve/reject button with no reasoning attached does not meet Art. 14, and an approval rate stuck near 100% means the gate is decorative.",
        recs:[
          { what:"Make approval records show what the reviewer was shown, and monitor the approval rate.",
            why:"Meaningful oversight is a testable claim. Sustained near-100% approval is evidence the reviewer cannot realistically dissent — which is a finding, not a success.",
            tools:"Review queue with the reasoning and evidence attached · approval-rate dashboard",
            constraint:"Showing full reasoning slows review; scope it to consequential action classes.",
            refs:[{name:"EU AI Act Art. 14",url:AIACT}] },
          { what:"Inventory agent-invokable actions and classify each reversible or not, naming the mechanism.",
            why:"Reversibility is a property of the system, not the agent: the same delete is reversible against a versioned store and not against a live one. Most irreversible actions can be made reversible with a delay window.",
            tools:"Versioned stores · outbox with delay · compensating transactions · staged writes",
            constraint:"A delay window is a product decision as much as a control — it changes the user experience.",
            refs:[{name:"Control 08",url:CONTROLS}] },
          { what:"Test the kill switch mid-run, not between runs.",
            why:"Stopping an agent between steps is easy. Stopping one mid-tool-call is the case that matters and is almost never exercised. Record the time from decision to stop.",
            tools:"Game day · a documented stop procedure with a named owner",
            constraint:"Mid-run termination can leave partial state — the test should surface that, which is the point.",
            refs:[{name:"APRA CPS 230",url:CPS230}] }
        ] },

      { minPct:0.6001, maxPct:0.8, name:"Evidenced",
        benchmark:'You could survive an assessment on this today. Beyond here the work stops being about a single agent and starts being about the fleet.',
        body:"<b>Controls are enforced and you can prove it.</b> The remaining work is compositional: what happens when one agent consumes another's output, and whether anyone can see what the fleet actually costs per unit of work delivered.",
        recs:[
          { what:"Make provenance work across agents, not just within one.",
            why:"As soon as one agent consumes another's output, a single-run trace stops being sufficient — the question becomes which chain of reasoning produced this, and BCBS 239-style lineage expectations start applying to model outputs.",
            tools:"Run IDs propagated through outputs · a lineage store over trajectories",
            constraint:"Chains fan out quickly; storage and query cost grow faster than run count.",
            refs:[{name:"Control 09",url:CONTROLS}] },
          { what:"Measure cost per resolved task, and track the cost of failed runs alongside it.",
            why:"Agent cost is nonlinear in a way single-call GenAI is not — retries, fan-out and growing context mean a task can cost ten times the estimate. Cost per token is the wrong unit; the runs that fail and get retried are the ones that hurt.",
            tools:"Trajectory-derived cost attribution · per-feature tagging",
            constraint:"Defining 'resolved' is the hard part and it is a product decision, not a platform one.",
            refs:[{name:"Control 10",url:CONTROLS}] },
          { what:"Turn the control set into a pipeline gate rather than a review.",
            why:"A review that happens once is a snapshot. A gate that runs on every deploy is a property.",
            tools:"agentcheck in CI · OPA policy over the agent manifest",
            constraint:"Gates need an exception path with an expiry or they get disabled.",
            refs:[{name:"Control 05",url:CONTROLS}] }
        ] },

      { minPct:0.8001, maxPct:1.0, name:"Engineered",
        benchmark:'Rare. At this level the controls are properties of the platform, so a new agent inherits them rather than implementing them.',
        body:"<b>The controls are the substrate, not the checklist.</b> A new agent gets identity, ceilings, authorisation and trajectory recording by being deployed on the platform. The work now is second-order: what the fleet does that no single agent does, and staying ahead of a threat model that is still moving.",
        recs:[
          { what:"Make the paved path the only path — a new agent inherits the ten controls by default.",
            why:"Defaults beat policies. If the scaffold produces a compliant agent without anyone thinking about it, that is what ships.",
            tools:"Internal agent scaffold · admission policy on the runtime · platform-issued identity",
            constraint:"Teams route around a paved path that is slower than the alternative — measure time-to-first-run.",
            refs:[{name:"ISO/IEC 42001",url:ISO}] },
          { what:"Treat the indirect-injection corpus as a living regression suite, refreshed against current research.",
            why:"This is the one control where the threat model moves faster than the standard. A suite written a year ago tests last year's payloads.",
            tools:"Scheduled refresh against ATLAS and OWASP updates · internal red-team findings fed back",
            constraint:"Requires someone whose job includes reading the research — budget the time explicitly.",
            refs:[{name:"MITRE ATLAS",url:ATLAS}] },
          { what:"Publish what you learned. The control set is public; your failure modes are not.",
            why:"Almost nobody has operated agents in a regulated environment for long enough to have real failure data. The organisations that publish theirs set the bar the rest are assessed against.",
            tools:"Post-incident writeups · contributions back to the public control set",
            constraint:"Legal review of anything public is slow — start the conversation before you have something to publish.",
            refs:[{name:"The ten controls",url:CONTROLS}] }
        ] }
    ],

    references: [
      { domain:"Regulation", name:"EU AI Act",  desc:"Art. 9 risk management, Art. 12 record-keeping, Art. 14 human oversight, Art. 15 robustness. The record-keeping and oversight articles are where agent deployments most often fall short.", url:AIACT },
      { domain:"Framework",  name:"NIST AI RMF", desc:"GOVERN / MAP / MEASURE / MANAGE. GOVERN-1.3 is the accountability line most often cited against oversight controls.", url:RMF },
      { domain:"Standard",   name:"ISO/IEC 42001", desc:"AI management system standard — the certifiable one, and the one procurement will start asking for.", url:ISO },
      { domain:"Security",   name:"OWASP Top 10 for LLM Applications", desc:"LLM01 prompt injection and LLM06 excessive agency are the two that describe agent failure directly.", url:OWASP },
      { domain:"Security",   name:"MITRE ATLAS", desc:"Adversarial technique knowledge base for AI systems. The reference for what indirect injection actually looks like in the wild.", url:ATLAS },
      { domain:"Regulation", name:"APRA CPS 230", desc:"Australian operational-risk standard. An agent inside a critical operation inherits its recovery, substitutability and testing obligations.", url:CPS230 },
      { domain:"Standard",   name:"AU Voluntary AI Safety Standard", desc:"Australia's current baseline expectation — ten guardrails, closely aligned to ISO 42001.", url:AUSTD },
      { domain:"Tooling",    name:"OpenTelemetry GenAI semantic conventions", desc:"The emerging vendor-neutral shape for trajectory data. Worth adopting before you have a proprietary format to migrate.", url:OTEL },
      { domain:"Reference",  name:"The ten controls in full", desc:"Each control with the evidence it produces, the read-only command that produces it, and the named way it fails. CC BY 4.0.", url:CONTROLS }
    ]
  });

});

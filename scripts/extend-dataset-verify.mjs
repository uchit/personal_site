#!/usr/bin/env node
/* extend-dataset-verify.mjs — attaches an executable check to the controls
 * that have one.
 *
 *   node scripts/extend-dataset-verify.mjs
 *
 * The evidence field describes the artefact an assessor wants: "IAM policy
 * export showing zero static long-lived credentials". That is the right
 * sentence and it still leaves the reader to work out how to produce it. The
 * gap between the description and the command is the gap between a checklist
 * and a tool, and the checklist is the part anyone can write.
 *
 * Two rules govern what goes in here:
 *
 *   1. READ ONLY. These get pasted into production accounts by people who are
 *      in a hurry. Nothing that writes, creates, deletes or generates. If a
 *      check can only be done by mutating something, it does not belong here.
 *
 *   2. NOT EVERY CONTROL GETS ONE. A board-level risk report and a quarterly
 *      access review have no command, and inventing a plausible-looking one
 *      would be worse than leaving the gap visible. Roughly half of these
 *      controls are governance; they keep the prose evidence and say so.
 *
 * Syntax is machine-checked by scripts/check-evidence.mjs wherever the CLI is
 * installed. Commands it cannot check are marked as such in the data rather
 * than presented with the same confidence.
 *
 * Idempotent — re-running replaces the verify blocks it owns.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = join(ROOT, "dataset/dataset.json");

/* run     — the command, read-only, paste-able
   expect  — what a passing result looks like, so the output is interpretable
   yields  — the artefact this hands to an assessor                          */
const VERIFY = {
  r001: [
    { platform: "AWS", run: "aws iam get-credential-report --query Content --output text | base64 -d | awk -F, 'NR>1 && ($9==\"true\" || $14==\"true\") {print $1}'",
      expect: "No output. Any name printed is a human or service user still holding an active static access key.",
      yields: "Access-key inventory per IAM user" },
    { platform: "AWS", run: "aws iam list-open-id-connect-providers --output table",
      expect: "At least one provider — this is the federation that replaces static keys.",
      yields: "OIDC trust configuration" },
    { platform: "GitHub Actions", run: "gh api /repos/:owner/:repo/actions/secrets --jq '.secrets[].name'",
      expect: "No AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY. Federated workflows need neither.",
      yields: "CI secret inventory" },
  ],
  r002: [
    { platform: "AWS", run: "aws iam list-policies --scope Local --only-attached --query 'Policies[].Arn' --output text",
      expect: "The attached customer-managed policies — the set to inspect for wildcards.",
      yields: "Attached policy inventory" },
    { platform: "AWS", run: "aws accessanalyzer list-analyzers --query 'analyzers[].{Name:name,Status:status}' --output table",
      expect: "An active analyzer. Without one, nobody is watching for over-broad grants.",
      yields: "Access Analyzer status" },
  ],
  r004: [
    { platform: "AWS", run: "aws iam get-credential-report --query Content --output text | base64 -d | awk -F, 'NR>1 && $4==\"true\" && $8==\"false\" {print $1}'",
      expect: "No output. Any name printed has console access with MFA disabled.",
      yields: "Password-enabled-without-MFA exception list" },
  ],
  r005: [
    { platform: "Sigstore", run: "cosign verify-attestation --type slsaprovenance --certificate-identity-regexp '.*' --certificate-oidc-issuer-regexp '.*' <image>",
      expect: "Verification succeeds and the predicate shows the builder ID and source repo.",
      yields: "SLSA provenance attestation" },
  ],
  r006: [
    { platform: "Syft", run: "syft <image> -o spdx-json=sbom.spdx.json",
      expect: "An SBOM that resolves the actual runtime image, not the source tree.",
      yields: "SPDX SBOM" },
    { platform: "Grype", run: "grype sbom:sbom.spdx.json --only-fixed -o table",
      expect: "The fixable set — the only part an owner-alert loop can act on.",
      yields: "Vulnerability report scoped to actionable findings" },
  ],
  r007: [
    { platform: "Kubernetes", run: "kubectl get clusterpolicy -o json | jq -r '.items[] | select(.spec.validationFailureAction==\"Enforce\") | .metadata.name'",
      expect: "The signature policy listed. In Audit mode it reports and admits — which is not a control.",
      yields: "Admission policy enforcement mode" },
  ],
  r009: [
    { platform: "npm", run: "jq -r '.dependencies, .devDependencies | select(.) | to_entries[] | select(.value | test(\"^[\\\\^~*]|x$\")) | .key' package.json",
      expect: "No output. Anything listed floats and can change between builds.",
      yields: "Unpinned dependency list" },
    { platform: "Containers", run: "grep -rnE '^FROM .*:(latest|[0-9]+)$|^FROM [^@]*$' --include=Dockerfile .",
      expect: "No output. A base image without a digest is not a locked version.",
      yields: "Unpinned base-image list" },
  ],
  r013: [
    { platform: "AWS", run: "aws s3api get-bucket-location --bucket <bucket> --output text",
      expect: "The pinned region and nothing else.",
      yields: "Per-bucket residency evidence" },
  ],
  r026: [
    { platform: "AWS", run: "aws cloudtrail describe-trails --query 'trailList[].{Name:Name,MultiRegion:IsMultiRegionTrail,Validation:LogFileValidationEnabled}' --output table",
      expect: "Validation true. Without log-file validation the trail is centralised but not tamper-evident.",
      yields: "Trail configuration incl. integrity validation" },
  ],
  r027: [
    { platform: "OpenSSL", run: "openssl s_client -connect <host>:443 -tls1_1 </dev/null 2>&1 | grep -c 'no protocol'",
      expect: "A non-zero count — the handshake must fail. Success here is the finding.",
      yields: "Deprecated-protocol negotiation attempt" },
    { platform: "OpenSSL", run: "openssl s_client -connect <host>:443 -tls1_3 </dev/null 2>&1 | grep 'Protocol'",
      expect: "TLSv1.3 negotiated.",
      yields: "Negotiated protocol record" },
  ],
  r028: [
    { platform: "AWS", run: "aws kms list-aliases --query 'Aliases[?starts_with(AliasName, `alias/aws/`)==`false`].AliasName' --output text",
      expect: "Customer-managed aliases. An empty result means everything sits on AWS-managed keys.",
      yields: "Customer-managed key inventory" },
  ],
  r029: [
    { platform: "GitHub", run: "gh api /repos/:owner/:repo/secret-scanning/alerts --jq '.[] | select(.state==\"open\") | .secret_type'",
      expect: "No output. An open alert is a live credential.",
      yields: "Open secret-scanning alerts" },
    { platform: "Git history", run: "gitleaks detect --source . --redact --report-format json --report-path leaks.json",
      expect: "Zero findings across history — rotating without rewriting leaves the secret reachable.",
      yields: "History scan report" },
  ],
  r030: [
    { platform: "Argo Rollouts", run: "kubectl get rollout -A -o json | jq -r '.items[] | select(.spec.strategy.canary==null and .spec.strategy.blueGreen==null) | .metadata.name'",
      expect: "No output. Anything listed still ships all-at-once.",
      yields: "Rollout strategy inventory" },
  ],
  r035: [
    { platform: "Istio", run: "kubectl get peerauthentication -A -o json | jq -r '.items[] | select(.spec.mtls.mode!=\"STRICT\") | \"\\(.metadata.namespace)/\\(.metadata.name)\"'",
      expect: "No output. PERMISSIVE accepts plaintext, so mTLS is available rather than enforced.",
      yields: "Per-namespace mTLS mode" },
  ],
  r036: [
    { platform: "Kubernetes", run: "kubectl get pods -A -o json | jq -r '.items[] | select(any(.spec.containers[]; .securityContext.allowPrivilegeEscalation != false)) | \"\\(.metadata.namespace)/\\(.metadata.name)\"'",
      expect: "No output. Unset is not false — the default permits escalation.",
      yields: "Pod privilege-escalation posture" },
  ],
  r041: [
    { platform: "Conftest", run: "terraform show -json plan.tfplan | conftest test --parser json -",
      expect: "All policies pass against the plan, before apply rather than after.",
      yields: "Plan-time policy result" },
  ],
  r042: [
    { platform: "Terraform", run: "terraform plan -detailed-exitcode -refresh-only",
      expect: "Exit code 0. Exit 2 means live config has drifted from source of truth.",
      yields: "Drift detection exit status" },
  ],
  r049: [
    { platform: "AWS", run: "aws s3api get-object-lock-configuration --bucket <bucket>",
      expect: "COMPLIANCE mode with a retention period. GOVERNANCE mode can be bypassed by a privileged caller.",
      yields: "Object-lock configuration" },
    { platform: "AWS", run: "aws backup list-backup-vaults --query 'BackupVaultList[].{Vault:BackupVaultName,Locked:Locked}' --output table",
      expect: "Locked true on the vault holding the offline copy.",
      yields: "Vault lock status" },
  ],
  r052: [
    { platform: "dig", run: "dig +short CAA <domain>",
      expect: "At least one issue record. Empty means any CA may issue for the domain.",
      yields: "CAA record set" },
    { platform: "dig", run: "dig +dnssec +short DS <domain>",
      expect: "A DS record — the delegation signer proving the chain is live.",
      yields: "DNSSEC delegation record" },
    { platform: "dig", run: "dig +short TXT _mta-sts.<domain>",
      expect: "A v=STSv1 policy record.",
      yields: "MTA-STS policy record" },
  ],
  r054: [
    { platform: "AWS", run: "aws ssm describe-patch-baselines --query 'BaselineIdentities[].{Name:BaselineName,Default:DefaultBaseline}' --output table",
      expect: "A default baseline exists and is the one you think it is.",
      yields: "Patch baseline inventory" },
  ],
  "agent-identity": [
    { platform: "AWS", run: "aws sts get-caller-identity --query Arn --output text",
      expect: "An assumed-role ARN for the agent itself — not a human's, and not one shared with other agents.",
      yields: "Runtime caller identity" },
  ],
  "agent-blast-radius": [
    { platform: "Kubernetes", run: "kubectl get resourcequota -A -o json | jq -r '.items[] | \"\\(.metadata.namespace) \\(.spec.hard)\"'",
      expect: "A quota on the agent's namespace. No quota means the ceiling is theoretical.",
      yields: "Enforced resource ceiling" },
  ],
  "agent-trajectory-trace": [
    { platform: "OpenTelemetry", run: "curl -s '<otlp-query>/api/traces?service=<agent>&limit=1' | jq '[.data[0].spans[] | select(.operationName|test(\"tool\"))] | length'",
      expect: "A span per tool call. If the count is zero the trajectory is reconstructed from logs, not recorded.",
      yields: "Per-run trajectory span count" },
  ],
};

const data = JSON.parse(readFileSync(PATH, "utf8"));
const byId = new Map(data.rows.map(r => [r.id, r]));

const unknown = Object.keys(VERIFY).filter(id => !byId.has(id));
if (unknown.length) {
  console.error(`\n  ERROR: verify blocks reference unknown control ids: ${unknown.join(", ")}\n`);
  process.exit(1);
}

let attached = 0, commands = 0;
for (const row of data.rows) {
  const v = VERIFY[row.id];
  if (v) { row.verify = v; attached++; commands += v.length; }
  else delete row.verify;
}

writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

const governance = data.rows.length - attached;
console.log(`\n  ${commands} commands attached to ${attached} of ${data.rows.length} controls`);
console.log(`  ${governance} controls have no executable check — governance and process, left as prose\n`);

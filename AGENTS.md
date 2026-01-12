# AGENTS.md

> Guide for AI coding agents working on the PEC + Policy Cards integration example.

This project demonstrates how [Protocol-Embedded Compliance (PEC)](https://usepec.eu) and [Policy Cards](https://arxiv.org/html/2510.24383v1) work together for AI agent governance.

## Project Overview

| Layer | Framework | Function |
|-------|-----------|----------|
| **Protocol** | PEC | MCP servers declare compliance metadata |
| **Deployment** | Policy Cards | Defines what agents CAN/CANNOT do |

**PEC** standardises compliance *information* at the protocol layer.
**Policy Cards** provides governance *logic* at the deployment layer.

This example shows the **Declare-Do-Audit** workflow:
1. **Declare**: Load and validate policy card
2. **Do**: Evaluate tools against policy card rules
3. **Audit**: Generate compliance report with evidence hashes

## Directory Structure

```
pec-policy-cards-example/
├── AGENTS.md                           # This file
├── README.md                           # User documentation
├── package.json
├── tsconfig.json
├── policy-cards/                       # Example policy cards (YAML)
│   ├── retail-banking.yaml            # EU financial services
│   └── clinical-sandbox.yaml          # US healthcare sandbox
├── src/
│   ├── index.ts                       # Main demo entry point
│   └── mock-servers.ts                # Mock MCP servers with PEC metadata
└── audit-report-*.json                # Generated audit reports
```

## Running the Demo

```bash
# Install dependencies
pnpm install

# Run the demo
pnpm start
```

**Output:** Evaluates 6 mock MCP servers against two policy cards (Retail Banking, Clinical Sandbox), showing rule violations, warnings, and KPI results.

## Standards
- Never use `any`
- Never use `unknown`
- Never use aggressive type-casting

## Dependencies

| Package | Purpose |
|---------|---------|
| `@protocol-embedded-compliance/mastra` | PEC types and filtering |
| `@protocol-embedded-compliance/policy-cards` | Policy Card loader, evaluator, auditor |
| `@mastra/core`, `@mastra/mcp` | Mastra framework (for tool types) |

## Policy Card Structure

Policy cards are YAML files with:

```yaml
policy_card_version: "0.1"
name: "Retail Banking Payments Agent"

scope:
  ai_act_risk_level: high
  geography: ["EU", "EEA"]
  intended_uses: ["payment_initiation", "fraud_detection"]

rules:
  - id: geo-restriction
    effect: deny
    condition:
      field: pec.processing_locations
      operator: not_any_of
      values: ["EU", "EEA", "ADEQUACY"]
    reason: "Tool processes data outside approved jurisdictions"

escalation:
  triggers:
    - condition: "transaction_value > 10000"
      action: human_approval_required

monitoring:
  detectors:
    - name: rejection_rate
      threshold: 0.3
      action: alert

kpis_thresholds:
  thresholds:
    - metric: compliance_rate
      target: 1.0
      critical_threshold: 0.95

assurance_mapping:
  nist: ["GOVERN-1", "MAP-1", "MEASURE-1"]
  iso_42001: ["ISO42001-4", "ISO42001-8"]
  eu_ai_act: ["EUAA-AnnexIV-3", "EUAA-Art72"]
```

## Mock Servers

The demo includes 6 mock MCP servers with PEC metadata:

| Server | Vendor | Location | Certifications |
|--------|--------|----------|----------------|
| acme_translate | Acme (Dublin) | IE, FR | ISO_27001, SOC2_TYPE_II |
| globalpay_fraud_check | GlobalPay (SF) | US, SG | PCI_DSS, SOC2_TYPE_II |
| swissvault_store | SwissVault (Zurich) | CH | ISO_27001, SOC2_TYPE_II |
| tokyoai_ocr | Tokyo AI Labs | JP | ISO_27001 |
| beijingcloud_compute | Beijing Cloud | CN | None |
| medixus_analyse | MedixUS (Boston) | US | HIPAA, SOC2_TYPE_II, HITRUST |

## Key Code Patterns

### Loading a Policy Card

```typescript
import { loadPolicyCard } from '@protocol-embedded-compliance/policy-cards'

const { success, policyCard, errors } = loadPolicyCard('./policy-cards/retail-banking.yaml')
```

### Evaluating PEC Metadata

```typescript
import { evaluatePolicyCard } from '@protocol-embedded-compliance/policy-cards'

const result = evaluatePolicyCard(policyCard, tool.compliance, tool.name)
// result.compliant, result.violations, result.warnings
```

### Generating Audit Reports

```typescript
import { PolicyCardAuditor } from '@protocol-embedded-compliance/policy-cards'

const auditor = new PolicyCardAuditor(policyCard)

for (const tool of tools) {
  auditor.evaluateAndRecord(tool.name, tool.compliance)
}

const report = auditor.generateReport()
// report.summary, report.kpi_results, report.evidence_hash
```

## Example Output

```
[DECLARE PHASE] Loading policy card...
  ✓ Policy card loaded: Retail Banking Payments Agent
  Rules: 6
  Assurance Mapping: NIST AI RMF, ISO 42001, EU AI Act

[DO PHASE] Evaluating tools...
  ✓ acme_translate: COMPLIANT
  ✗ globalpay_fraud_check: REJECTED
    → [geo-restriction] Tool processes data outside approved jurisdictions
    → [conformity-required] Tool has not undergone EU AI Act conformity assessment

[AUDIT PHASE] Generating report...
  Compliance rate: 50.0% (target: 100.0%) [CRITICAL]
  Evidence hash: sha256:6fafb61fc61a24580...
```

## Code Style

- **Language**: TypeScript (strict mode)
- **Module System**: ESM (`"type": "module"`)
- **Runtime**: TypeScript executed directly via `tsx`

## Adding New Policy Cards

1. Create YAML file in `policy-cards/` directory
2. Follow schema: `policy_card_version`, `name`, `scope`, `rules` (required)
3. Add call to `runPolicyCardDemo()` in `src/index.ts`

## Adding New Mock Servers

1. Define `PecComplianceMetadata` object in `src/mock-servers.ts`
2. Add to `allMockTools` array
3. Run demo to see filtering results

## Audit Report Schema

Generated audit reports include:

```typescript
interface AuditReport {
  audit_id: string
  policy_card: string
  period_start: string
  period_end: string
  summary: {
    total_invocations: number
    compliant: number
    rejected: number
    escalated: number
    warned: number
  }
  kpi_results: Array<{
    metric: string
    value: number
    target: number
    status: 'pass' | 'warn' | 'fail' | 'critical'
  }>
  assurance_coverage: {
    nist: string[]
    iso_42001: string[]
    eu_ai_act: string[]
  }
  evidence_entries: AuditEvidence[]
  evidence_hash: string
}
```

## References

- [Policy Cards Paper](https://arxiv.org/html/2510.24383v1) — Mavračić (2025)
- [Protocol-Embedded Compliance](https://usepec.eu) — Jones (2026)
- [pec-example](../pec-example) — PEC-only demo
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [ISO/IEC 42001](https://www.iso.org/standard/42001)
- [EU AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689)

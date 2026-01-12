# AGENTS.md

> Guide for AI coding agents working on the PEC + Policy Cards integration example.

This project demonstrates how [Protocol-Embedded Compliance (PEC)](https://usepec.eu) and [Policy Cards](https://arxiv.org/html/2510.24383v1) work together for AI agent governance.

## Project Overview

| Layer | Framework | Function |
|-------|-----------|----------|
| **Protocol** | PEC | MCP servers declare compliance metadata |
| **Deployment** | Policy Cards | Defines what agents CAN/CANNOT do |
| **Runtime** | Mastra + OpenAI | Real AI agent with tool calling |

**PEC** standardises compliance *information* at the protocol layer.
**Policy Cards** provides governance *logic* at the deployment layer.

This example shows the **Declare-Do-Audit** workflow with a **real MCP server** and **real AI agent**:
1. **Declare**: Load and validate policy card
2. **Do**: Filter MCP tools by policy card rules, agent calls compliant tools
3. **Audit**: Generate compliance report with evidence hashes

## Directory Structure

```
pec-policy-cards-example/
├── AGENTS.md                           # This file
├── README.md                           # User documentation
├── package.json
├── pnpm-workspace.yaml                 # Monorepo workspace config
├── tsconfig.json
├── policy-cards/                       # Example policy cards (YAML)
│   ├── retail-banking.yaml            # EU financial services
│   └── clinical-sandbox.yaml          # US healthcare sandbox
├── mcp-server/                         # Real MCP server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                   # MCP server entry point
│       └── tools.ts                   # Tool definitions with PEC metadata
├── src/
│   ├── index.ts                       # Main demo entry point
│   └── agent.ts                       # Governed agent creation
└── audit-report-*.json                # Generated audit reports (gitignored)
```

## Running the Demo

```bash
# Install dependencies
pnpm install

# Run the demo
pnpm start
```

**Output:** Connects to a real MCP server, discovers 4 tools with PEC metadata, evaluates them against two policy cards (Retail Banking, Clinical Sandbox), and runs a real OpenAI agent that can only call compliant tools.

## Standards
- Never use `any`
- Never use `unknown`
- Never use aggressive type-casting

## Dependencies

| Package | Purpose |
|---------|---------|
| `@ai-sdk/openai` | OpenAI model provider for AI SDK |
| `ai` | Vercel AI SDK for agent generation |
| `@protocol-embedded-compliance/mastra` | PEC types and MCP client |
| `@protocol-embedded-compliance/policy-cards` | Policy Card loader, evaluator, auditor |
| `@mastra/core`, `@mastra/mcp` | Mastra framework (agent, tools, MCP) |

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

## MCP Server Tools

The MCP server exposes 4 tools with PEC metadata:

| Tool | Location | Risk | Certifications |
|------|----------|------|----------------|
| eu_payment_processor | DE, IE | limited | ISO_27001, SOC2_TYPE_II, PCI_DSS |
| document_scanner | NL, FR | minimal | ISO_27001 |
| clinical_analyser | US | high | HIPAA, SOC2_TYPE_II, HITRUST |
| offshore_compute | CN | limited | None |

## Key Code Patterns

### Connecting to MCP Server

```typescript
import { connectToMcpServer } from './agent'

const mcpConnection = await connectToMcpServer('./mcp-server/src/index.ts')
// mcpConnection.tools contains discovered tools with PEC metadata
```

### Creating a Governed Agent

```typescript
import { createGovernedAgent } from './agent'

const { agent, compliantTools, rejectedTools } = await createGovernedAgent({
  policyCardPath: './policy-cards/retail-banking.yaml',
  model: 'gpt-4o-mini',
  mcpConnection
})
// agent only has access to compliantTools
```

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
══════════════════════════════════════════════════════════════════════
  Connecting to Real MCP Server
══════════════════════════════════════════════════════════════════════

  ✓ Connected to MCP server
  ✓ Discovered 4 tools with PEC metadata

    • eu_payment_processor
      Locations: DE, IE
      Risk: limited

══════════════════════════════════════════════════════════════════════
  Retail Banking - Agent Demo
══════════════════════════════════════════════════════════════════════

[DECLARE PHASE] Loading policy card and creating governed agent...

  ✓ Policy card loaded: Retail Banking Payments Agent
  ✓ Agent created with 2 compliant tools
  ✗ 2 tools rejected by policy card

  Compliant tools:
    ✓ eu_payment_processor (DE, IE)
    ✓ document_scanner (NL, FR)

  Rejected tools:
    ✗ clinical_analyser
      → Tool processes data outside approved jurisdictions
    ✗ offshore_compute
      → Tool lacks valid GDPR Chapter V transfer mechanism

[DO PHASE] Running agent with user prompt...

  User: Please process a payment of 500 EUR to IBAN DE89370400440532013000

  Agent: Processing your payment...

  Tools called:
    → eu_payment_processor({"amount":500,"recipient_iban":"DE89..."})

[AUDIT PHASE] Generating compliance report...

  Compliance rate: 50.0% (target: 100.0%) [CRITICAL]
  Evidence hash: sha256:6fbe513545ae3fcce...
```

## Code Style

- **Language**: TypeScript (strict mode)
- **Module System**: ESM (`"type": "module"`)
- **Runtime**: TypeScript executed directly via `tsx`

## Adding New Policy Cards

1. Create YAML file in `policy-cards/` directory
2. Follow schema: `policy_card_version`, `name`, `scope`, `rules` (required)
3. Add call to `runAgentDemo()` in `src/index.ts`

## Adding New MCP Tools

1. Define `PecComplianceMetadata` object in `mcp-server/src/tools.ts`
2. Create Mastra tool with PEC metadata in description
3. Add to `mastraTools` map in `mcp-server/src/index.ts`
4. Run demo to see filtering results

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
- [pec-example](../pec-example) — PEC-only demo (no Policy Cards)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [ISO/IEC 42001](https://www.iso.org/standard/42001)
- [EU AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689)

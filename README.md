# PEC + Policy Cards Integration Example

This example demonstrates the integration of [Protocol-Embedded Compliance (PEC)](https://usepec.eu) with [Policy Cards](https://arxiv.org/html/2510.24383v1), showing how the two frameworks complement each other for AI agent governance.

## Overview

| Layer | Framework | Function |
|-------|-----------|----------|
| **Protocol** | PEC | MCP servers declare compliance metadata |
| **Deployment** | Policy Cards | Defines what agents CAN/CANNOT do |

**PEC** standardises compliance *information* at the protocol layer.
**Policy Cards** provides governance *logic* at the deployment layer.

Together they enable verifiable, auditable compliance at runtime.

## What This Demo Shows

1. **Declare Phase**: Load and validate policy cards (YAML/JSON)
2. **Do Phase**: Evaluate PEC metadata against policy card rules
3. **Audit Phase**: Generate compliance reports with evidence hashes

### Example Output

```
[DECLARE PHASE] Loading policy card...
  ✓ Policy card loaded: Retail Banking Payments Agent
  Rules: 6
  Assurance Mapping: NIST AI RMF, ISO 42001, EU AI Act

[DO PHASE] Evaluating tools...
  ✓ acme_translate: COMPLIANT
  ✗ globalpay_fraud_check: REJECTED
    → [geo-restriction] Tool processes data outside approved jurisdictions

[AUDIT PHASE] Generating report...
  Compliance rate: 50.0% [CRITICAL]
  Evidence hash: sha256:6fafb61fc61a24580...
```

## Installation

```bash
pnpm install
```

## Usage

```bash
pnpm start
```

This will:
1. Load two example policy cards (Retail Banking, Clinical Sandbox)
2. Evaluate 6 mock MCP servers against each policy card
3. Generate audit reports in JSON format

## Project Structure

```
pec-policy-cards-example/
├── policy-cards/
│   ├── retail-banking.yaml      # EU banking policy card
│   └── clinical-sandbox.yaml    # US healthcare sandbox policy card
├── src/
│   ├── mock-servers.ts          # Mock MCP servers with PEC metadata
│   └── index.ts                 # Main demo
├── audit-report-*.json          # Generated audit reports
└── README.md
```

## Policy Card Features Demonstrated

### Rules with PEC Field References

```yaml
rules:
  - id: geo-restriction
    effect: deny
    condition:
      field: pec.processing_locations
      operator: not_any_of
      values: ["EU", "EEA", "ADEQUACY"]
    reason: "Tool processes data outside approved jurisdictions"
```

### Assurance Framework Mapping

```yaml
assurance_mapping:
  nist: ["GOVERN-1", "MAP-1", "MEASURE-1"]
  iso_42001: ["ISO42001-4", "ISO42001-8"]
  eu_ai_act: ["EUAA-AnnexIV-3", "EUAA-Art72"]
```

### KPIs and Thresholds

```yaml
kpis_thresholds:
  thresholds:
    - metric: compliance_rate
      target: 1.0
      critical_threshold: 0.95
```

## Dependencies

- `@protocol-embedded-compliance/mastra` - PEC types and filtering
- `@protocol-embedded-compliance/policy-cards` - Policy Card loader, evaluator, auditor

## References

- [Policy Cards Paper](https://arxiv.org/html/2510.24383v1) - Mavračić (2025)
- [Protocol-Embedded Compliance](https://usepec.eu) - Jones (2026)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [ISO/IEC 42001](https://www.iso.org/standard/42001)
- [EU AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689)

## License

MIT

// pec-policy-cards-example/src/index.ts

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

import { createGovernedAgent, connectToMcpServer, type McpConnection } from './agent'

function printBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  PEC + Policy Cards Integration Demo                                 ║
║                                                                      ║
║  This demo shows:                                                    ║
║  • A REAL AI agent powered by OpenAI                                 ║
║  • A REAL MCP server exposing tools with PEC metadata                ║
║  • Policy Cards filtering which tools the agent can use              ║
║  • PEC metadata evaluated against policy card rules                  ║
║  • Declare-Do-Audit workflow for verifiable compliance               ║
║                                                                      ║
║  Based on:                                                           ║
║  • Policy Cards (arxiv:2510.24383)                                   ║
║  • Protocol-Embedded Compliance (usepec.eu)                          ║
╚══════════════════════════════════════════════════════════════════════╝
`)
}

function printSection(title: string) {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  ${title}`)
  console.log(`${'═'.repeat(70)}\n`)
}

async function runAgentDemo(
  policyCardPath: string,
  contextName: string,
  userPrompt: string,
  mcpConnection: McpConnection
) {
  printSection(`${contextName} - Agent Demo`)

  console.log(`[DECLARE PHASE] Loading policy card and creating governed agent...\n`)

  const {
    agent,
    policyCard,
    auditor,
    compliantTools,
    rejectedTools,
    toolCount
  } = await createGovernedAgent({
    policyCardPath,
    model: 'gpt-4o-mini',
    mcpConnection
  })

  console.log(`  ✓ Policy card loaded: ${policyCard.name}`)
  console.log(`  ✓ Agent created with ${compliantTools.length} compliant tools`)
  console.log(`  ✗ ${rejectedTools.length} tools rejected by policy card`)
  console.log(`  Total tools from MCP server: ${toolCount}\n`)

  console.log(`  Compliant tools:`)
  for (const tool of compliantTools) {
    console.log(`    ✓ ${tool.name} (${tool.compliance.processing_locations.join(', ')})`)
  }

  if (rejectedTools.length > 0) {
    console.log(`\n  Rejected tools:`)
    for (const { tool, violations } of rejectedTools) {
      console.log(`    ✗ ${tool.name}`)
      for (const v of violations) {
        console.log(`      → ${v}`)
      }
    }
  }

  console.log(`\n${'─'.repeat(70)}`)
  console.log(`  [DO PHASE] Running agent with user prompt...`)
  console.log(`${'─'.repeat(70)}\n`)

  console.log(`  User: ${userPrompt}\n`)

  try {
    const response = await agent.generate([{ role: 'user', content: userPrompt }])

    console.log(`  Agent: ${response.text}\n`)

    if (response.steps && response.steps.length > 0) {
      for (const step of response.steps) {
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log(`  Tools called:`)
          for (const call of step.toolCalls) {
            const payload = call.payload
            if (payload && 'toolName' in payload && 'args' in payload) {
              console.log(`    → ${payload.toolName}(${JSON.stringify(payload.args)})`)
            }
          }
        }
        if (step.toolResults && step.toolResults.length > 0) {
          console.log(`  Tool results:`)
          for (const result of step.toolResults) {
            const payload = result.payload
            if (payload && 'toolName' in payload && 'result' in payload) {
              console.log(`    → ${payload.toolName}: ${JSON.stringify(payload.result)}`)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`)
  }

  console.log(`\n${'─'.repeat(70)}`)
  console.log(`  [AUDIT PHASE] Generating compliance report...`)
  console.log(`${'─'.repeat(70)}\n`)

  const report = auditor.generateReport()

  console.log(`  Audit ID: ${report.audit_id}`)
  console.log(`  Summary:`)
  console.log(`    Total evaluations: ${report.summary.total_invocations}`)
  console.log(`    Compliant: ${report.summary.compliant}`)
  console.log(`    Rejected: ${report.summary.rejected}`)

  if (report.kpi_results.length > 0) {
    console.log(`\n  KPI Results:`)
    for (const kpi of report.kpi_results) {
      const statusIcon = kpi.status === 'pass' ? '✓' : kpi.status === 'warn' ? '⚠' : '✗'
      console.log(`    ${statusIcon} ${kpi.metric}: ${(kpi.value * 100).toFixed(1)}% (target: ${(kpi.target * 100).toFixed(1)}%) [${kpi.status.toUpperCase()}]`)
    }
  }

  const reportPath = resolve(__dirname, `../audit-report-${contextName.toLowerCase().replace(/\s+/g, '-')}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n  Audit report saved: ${reportPath}`)
  console.log(`  Evidence hash: ${report.evidence_hash.substring(0, 24)}...`)

  return { agent, policyCard, auditor, report }
}

async function main() {
  printBanner()

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required')
    console.error('Please create a .env file with your OpenAI API key')
    process.exit(1)
  }

  printSection('Connecting to Real MCP Server')

  const mcpServerPath = resolve(__dirname, '../mcp-server/src/index.ts')

  console.log(`  Connecting to MCP server via stdio...`)
  console.log(`  Server path: ${mcpServerPath}\n`)

  const mcpConnection = await connectToMcpServer(mcpServerPath)

  console.log(`  ✓ Connected to MCP server`)
  console.log(`  ✓ Discovered ${mcpConnection.tools.length} tools with PEC metadata\n`)

  for (const tool of mcpConnection.tools) {
    console.log(`    • ${tool.name}`)
    console.log(`      Locations: ${tool.compliance.processing_locations.join(', ')}`)
    console.log(`      Risk: ${tool.compliance.ai_act_status.classification}`)
  }

  const retailBankingPath = resolve(__dirname, '../policy-cards/retail-banking.yaml')
  await runAgentDemo(
    retailBankingPath,
    'Retail Banking',
    'Please process a payment of 500 EUR to IBAN DE89370400440532013000',
    mcpConnection
  )

  console.log('\n')

  const clinicalSandboxPath = resolve(__dirname, '../policy-cards/clinical-sandbox.yaml')
  await runAgentDemo(
    clinicalSandboxPath,
    'Clinical Sandbox',
    'Can you analyse patient records P-001 and P-002 for any trends?',
    mcpConnection
  )

  try {
    await mcpConnection.disconnect()
    console.log(`\n  ✓ Disconnected from MCP server`)
  } catch {
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  Summary                                                             ║
║                                                                      ║
║  This demo showed the COMPLETE stack:                                ║
║                                                                      ║
║  1. REAL MCP server exposing tools with PEC metadata                 ║
║  2. REAL AI agents (OpenAI GPT-4o-mini) with tool calling            ║
║  3. Policy Cards governing which tools agents can access             ║
║  4. PEC metadata evaluated at runtime against policy rules           ║
║  5. Audit reports with evidence hashes for compliance tracking       ║
║                                                                      ║
║  The same tools were filtered differently based on policy context:   ║
║  • Retail Banking: EU data residency, GDPR transfer mechanisms       ║
║  • Clinical Sandbox: US processing, HIPAA certification required     ║
╚══════════════════════════════════════════════════════════════════════╝
`)
}

main().catch(console.error)

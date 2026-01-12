// pec-policy-cards-example/src/agent.ts

import { Agent } from '@mastra/core/agent'
import { MCPClient } from '@mastra/mcp'
import { openai } from '@ai-sdk/openai'

import type { PecComplianceMetadata } from '@protocol-embedded-compliance/mastra'
import {
  loadPolicyCard,
  evaluatePolicyCard,
  PolicyCardAuditor,
  type PolicyCard
} from '@protocol-embedded-compliance/policy-cards'

const PEC_METADATA_REGEX = /\[PEC_COMPLIANCE:(\{[\s\S]*\})\]$/

function parsePecMetadata(description: string): PecComplianceMetadata | null {
  const match = description.match(PEC_METADATA_REGEX)
  if (!match) return null

  try {
    return JSON.parse(match[1]) as PecComplianceMetadata
  } catch {
    return null
  }
}

export interface DiscoveredPecTool {
  name: string
  description: string
  compliance: PecComplianceMetadata
}

export interface McpConnection {
  client: MCPClient
  tools: DiscoveredPecTool[]
  rawTools: Record<string, { description?: string; execute: (args: Record<string, string>) => Promise<Record<string, string>> }>
  disconnect: () => Promise<void>
}

interface McpServerConfig {
  command: string
  args: string[]
}

export async function connectToMcpServer(serverPath: string): Promise<McpConnection> {
  const serverConfig: McpServerConfig = {
    command: 'npx',
    args: ['tsx', serverPath]
  }

  const client = new MCPClient({
    servers: {
      pecServer: serverConfig
    }
  })

  const rawTools = await client.getTools() as Record<string, { description?: string; execute: (args: Record<string, string>) => Promise<Record<string, string>> }>

  const tools: DiscoveredPecTool[] = []

  for (const [toolName, toolDef] of Object.entries(rawTools)) {
    const description = toolDef.description || ''
    const compliance = parsePecMetadata(description)

    if (compliance !== null) {
      const cleanName = toolName.replace(/^[^_]+_/, '')
      tools.push({
        name: cleanName,
        description: description.replace(PEC_METADATA_REGEX, '').trim(),
        compliance
      })
    }
  }

  return {
    client,
    tools,
    rawTools,
    disconnect: () => client.disconnect()
  }
}

export function filterToolsByPolicyCard(
  tools: DiscoveredPecTool[],
  policyCard: PolicyCard,
  auditor?: PolicyCardAuditor
): { compliant: DiscoveredPecTool[]; rejected: Array<{ tool: DiscoveredPecTool; violations: string[] }> } {
  const compliant: DiscoveredPecTool[] = []
  const rejected: Array<{ tool: DiscoveredPecTool; violations: string[] }> = []

  for (const tool of tools) {
    let evaluation
    if (auditor) {
      const result = auditor.evaluateAndRecord(tool.name, tool.compliance)
      evaluation = result.evaluation
    } else {
      evaluation = evaluatePolicyCard(policyCard, tool.compliance, tool.name)
    }

    if (evaluation.compliant) {
      compliant.push(tool)
    } else {
      rejected.push({
        tool,
        violations: evaluation.violations.map(v => v.reason)
      })
    }
  }

  return { compliant, rejected }
}

export interface GovernedAgentConfig {
  policyCardPath: string
  model?: string
  mcpConnection: McpConnection
}

export async function createGovernedAgent(config: GovernedAgentConfig): Promise<{
  agent: Agent
  policyCard: PolicyCard
  auditor: PolicyCardAuditor
  compliantTools: DiscoveredPecTool[]
  rejectedTools: Array<{ tool: DiscoveredPecTool; violations: string[] }>
  toolCount: number
}> {
  const loadResult = loadPolicyCard(config.policyCardPath)
  if (!loadResult.success || !loadResult.policyCard) {
    throw new Error(`Failed to load policy card: ${loadResult.errors.join(', ')}`)
  }

  const policyCard = loadResult.policyCard
  const auditor = new PolicyCardAuditor(policyCard)

  const allTools = config.mcpConnection.tools
  const toolCount = allTools.length

  const { compliant, rejected } = filterToolsByPolicyCard(allTools, policyCard, auditor)

  const toolsMap: Record<string, { description?: string; execute: (args: Record<string, string>) => Promise<Record<string, string>> }> = {}
  for (const tool of compliant) {
    const rawToolKey = Object.keys(config.mcpConnection.rawTools).find(k => k.endsWith(`_${tool.name}`))
    if (rawToolKey) {
      toolsMap[tool.name] = config.mcpConnection.rawTools[rawToolKey]
    }
  }

  const agent = new Agent({
    name: `${policyCard.name} Agent`,
    instructions: `You are an AI assistant operating under the "${policyCard.name}" policy card.

Your deployment context:
- AI Act Risk Level: ${policyCard.scope.ai_act_risk_level || 'unspecified'}
- Geography: ${policyCard.scope.geography?.join(', ') || 'unspecified'}
- Intended Uses: ${policyCard.scope.intended_uses?.join(', ') || 'unspecified'}

You have access to ${compliant.length} compliant tools. ${rejected.length} tools were rejected by the policy card and are NOT available to you.

Available tools:
${compliant.map(t => `- ${t.name}: ${t.description}`).join('\n')}

When asked to perform a task, use the appropriate tools. If a task would require a tool that is not available, explain that the tool is not permitted under the current policy.`,
    model: openai(config.model || 'gpt-4o-mini'),
    tools: toolsMap
  })

  return {
    agent,
    policyCard,
    auditor,
    compliantTools: compliant,
    rejectedTools: rejected,
    toolCount
  }
}

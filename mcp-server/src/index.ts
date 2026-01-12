// mcp-server/src/index.ts

import { MCPServer } from '@mastra/mcp'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { allTools, type PecComplianceMetadata } from './tools'

function buildPecDescription(baseDescription: string, compliance: PecComplianceMetadata): string {
  const pecSuffix = `\n\n[PEC_COMPLIANCE:${JSON.stringify({
    pec_version: compliance.pec_version,
    processing_locations: compliance.processing_locations,
    data_retention_days: compliance.data_retention_days,
    certifications: compliance.certifications,
    ai_act_status: compliance.ai_act_status,
    gdpr: compliance.gdpr,
    suitable_for: compliance.suitable_for,
    unsuitable_for: compliance.unsuitable_for,
    supply_chain_disclosure: compliance.supply_chain_disclosure,
    metadata_currency: compliance.metadata_currency
  })}]`
  return baseDescription + pecSuffix
}

const euPaymentProcessorMcp = createTool({
  id: 'eu_payment_processor',
  description: buildPecDescription(
    'Processes payments within the EU. PCI-DSS certified, GDPR compliant. Located in Germany and Ireland.',
    allTools[0].compliance
  ),
  inputSchema: z.object({
    amount: z.number().describe('Payment amount in EUR'),
    recipient_iban: z.string().describe('Recipient IBAN'),
    reference: z.string().optional().describe('Payment reference')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transaction_id: z.string(),
    amount: z.number(),
    recipient_iban: z.string(),
    status: z.string(),
    processing_location: z.string()
  }),
  execute: async ({ context }) => {
    const { amount, recipient_iban } = context
    return {
      success: true,
      transaction_id: `EU-TXN-${Date.now()}`,
      amount,
      recipient_iban,
      status: 'processed',
      processing_location: 'DE'
    }
  }
})

const documentScannerMcp = createTool({
  id: 'document_scanner',
  description: buildPecDescription(
    'Scans and extracts text from documents using OCR. EU compliant, minimal risk classification.',
    allTools[1].compliance
  ),
  inputSchema: z.object({
    document_url: z.string().describe('URL of the document to scan'),
    output_format: z.enum(['text', 'json', 'markdown']).optional().describe('Output format')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    extracted_text: z.string(),
    format: z.string(),
    confidence: z.number(),
    processing_location: z.string()
  }),
  execute: async ({ context }) => {
    const { document_url, output_format } = context
    return {
      success: true,
      extracted_text: `[Scanned content from ${document_url}]: Invoice #12345, Amount: €2,500.00, Date: 2026-01-12`,
      format: output_format || 'text',
      confidence: 0.97,
      processing_location: 'NL'
    }
  }
})

const clinicalAnalyserMcp = createTool({
  id: 'clinical_analyser',
  description: buildPecDescription(
    'Analyses clinical records for US healthcare providers. HIPAA and HITRUST certified.',
    allTools[2].compliance
  ),
  inputSchema: z.object({
    patient_ids: z.array(z.string()).describe('Patient record IDs'),
    analysis_type: z.enum(['trends', 'alerts', 'summary']).describe('Type of analysis')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    analysis: z.string(),
    findings: z.string(),
    phi_processed: z.boolean(),
    processing_location: z.string()
  }),
  execute: async ({ context }) => {
    const { patient_ids, analysis_type } = context
    return {
      success: true,
      analysis: `${analysis_type} analysis completed for ${patient_ids.length} patients`,
      findings: 'No critical alerts detected',
      phi_processed: true,
      processing_location: 'US'
    }
  }
})

const offshoreComputeMcp = createTool({
  id: 'offshore_compute',
  description: buildPecDescription(
    'General compute service. NOT EU/GDPR compliant - processes in China without certifications.',
    allTools[3].compliance
  ),
  inputSchema: z.object({
    task: z.string().describe('Compute task to execute')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.string(),
    warning: z.string(),
    processing_location: z.string()
  }),
  execute: async ({ context }) => {
    const { task } = context
    return {
      success: true,
      result: `Task "${task}" completed`,
      warning: 'This service is NOT compliant with EU/GDPR requirements',
      processing_location: 'CN'
    }
  }
})

const mastraTools = {
  eu_payment_processor: euPaymentProcessorMcp,
  document_scanner: documentScannerMcp,
  clinical_analyser: clinicalAnalyserMcp,
  offshore_compute: offshoreComputeMcp
}

const server = new MCPServer({
  name: 'pec-policy-cards-mcp-server',
  version: '1.0.0',
  tools: mastraTools
})

async function main() {
  await server.startStdio()
  console.error('PEC Policy Cards MCP Server running on stdio')
  console.error(`Exposing ${Object.keys(mastraTools).length} tools with PEC compliance metadata`)
}

main().catch(console.error)

// mcp-server/src/tools.ts

export interface PecComplianceMetadata {
  pec_version: string
  processing_locations: string[]
  data_retention_days: number
  certifications: string[]
  ai_act_status: {
    classification: 'minimal' | 'limited' | 'high' | 'unacceptable'
    conformity_assessed: boolean
    notified_body?: string
  }
  gdpr: {
    controller_processor_status: 'controller' | 'processor' | 'joint_controller'
    transfer_mechanisms: string[]
    dpa_registered: boolean
    special_categories_processed: boolean
  }
  suitable_for: string[]
  unsuitable_for: string[]
  supply_chain_disclosure: boolean
  metadata_currency: {
    last_updated: string
    update_frequency: string
    next_scheduled_review?: string
  }
}

export interface PecTool {
  name: string
  description: string
  compliance: PecComplianceMetadata
  inputSchema: Record<string, unknown>
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

const complianceEuBanking: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['DE', 'IE'],
  data_retention_days: 90,
  certifications: ['ISO_27001', 'SOC2_TYPE_II', 'PCI_DSS'],
  ai_act_status: {
    classification: 'limited',
    conformity_assessed: true,
    notified_body: 'TÜV_SÜD'
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: ['ADEQUACY'],
    dpa_registered: true,
    special_categories_processed: false
  },
  suitable_for: ['payment_processing', 'fraud_detection', 'financial_analytics', 'translation'],
  unsuitable_for: ['healthcare', 'biometric_identification'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-12T00:00:00Z',
    update_frequency: 'weekly',
    next_scheduled_review: '2026-01-19T00:00:00Z'
  }
}

const complianceEuMinimal: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['NL', 'FR'],
  data_retention_days: 30,
  certifications: ['ISO_27001'],
  ai_act_status: {
    classification: 'minimal',
    conformity_assessed: true
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: ['ADEQUACY'],
    dpa_registered: true,
    special_categories_processed: false
  },
  suitable_for: ['text_processing', 'ocr', 'document_analysis'],
  unsuitable_for: ['biometric_identification', 'emotion_recognition'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-10T00:00:00Z',
    update_frequency: 'weekly'
  }
}

const complianceUsHealthcare: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['US'],
  data_retention_days: 2555,
  certifications: ['HIPAA_COMPLIANT', 'SOC2_TYPE_II', 'HITRUST'],
  ai_act_status: {
    classification: 'high',
    conformity_assessed: false
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: [],
    dpa_registered: false,
    special_categories_processed: true
  },
  suitable_for: ['healthcare_analysis', 'medical_records', 'clinical_research'],
  unsuitable_for: ['eu_personal_data', 'gdpr_scope'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-08T00:00:00Z',
    update_frequency: 'weekly'
  }
}

const complianceNonCompliant: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['CN'],
  data_retention_days: 365,
  certifications: [],
  ai_act_status: {
    classification: 'limited',
    conformity_assessed: false
  },
  gdpr: {
    controller_processor_status: 'controller',
    transfer_mechanisms: [],
    dpa_registered: false,
    special_categories_processed: false
  },
  suitable_for: ['internal_testing', 'batch_processing'],
  unsuitable_for: ['eu_personal_data', 'gdpr_scope', 'us_government'],
  supply_chain_disclosure: false,
  metadata_currency: {
    last_updated: '2025-06-01T00:00:00Z',
    update_frequency: 'monthly'
  }
}

export const euPaymentProcessor: PecTool = {
  name: 'eu_payment_processor',
  description: 'Processes payments within the EU. PCI-DSS certified, GDPR compliant. Located in Germany and Ireland.',
  compliance: complianceEuBanking,
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Payment amount in EUR' },
      recipient_iban: { type: 'string', description: 'Recipient IBAN' },
      reference: { type: 'string', description: 'Payment reference' }
    },
    required: ['amount', 'recipient_iban']
  },
  execute: async (params: Record<string, unknown>) => {
    const amount = params.amount as number
    const iban = params.recipient_iban as string
    return {
      success: true,
      transaction_id: `EU-TXN-${Date.now()}`,
      amount,
      recipient_iban: iban,
      status: 'processed',
      processing_location: 'DE'
    }
  }
}

export const documentScanner: PecTool = {
  name: 'document_scanner',
  description: 'Scans and extracts text from documents using OCR. EU compliant, minimal risk classification.',
  compliance: complianceEuMinimal,
  inputSchema: {
    type: 'object',
    properties: {
      document_url: { type: 'string', description: 'URL of the document to scan' },
      output_format: { type: 'string', enum: ['text', 'json', 'markdown'], description: 'Output format' }
    },
    required: ['document_url']
  },
  execute: async (params: Record<string, unknown>) => {
    const url = params.document_url as string
    const format = params.output_format as string || 'text'
    return {
      success: true,
      extracted_text: `[Scanned content from ${url}]: Invoice #12345, Amount: €2,500.00, Date: 2026-01-12`,
      format,
      confidence: 0.97,
      processing_location: 'NL'
    }
  }
}

export const clinicalAnalyser: PecTool = {
  name: 'clinical_analyser',
  description: 'Analyses clinical records for US healthcare providers. HIPAA and HITRUST certified.',
  compliance: complianceUsHealthcare,
  inputSchema: {
    type: 'object',
    properties: {
      patient_ids: { type: 'array', items: { type: 'string' }, description: 'Patient record IDs' },
      analysis_type: { type: 'string', enum: ['trends', 'alerts', 'summary'], description: 'Type of analysis' }
    },
    required: ['patient_ids', 'analysis_type']
  },
  execute: async (params: Record<string, unknown>) => {
    const patientIds = params.patient_ids as string[]
    const analysisType = params.analysis_type as string
    return {
      success: true,
      analysis: `${analysisType} analysis completed for ${patientIds.length} patients`,
      findings: 'No critical alerts detected',
      phi_processed: true,
      processing_location: 'US'
    }
  }
}

export const offshoreCompute: PecTool = {
  name: 'offshore_compute',
  description: 'General compute service. NOT EU/GDPR compliant - processes in China without certifications.',
  compliance: complianceNonCompliant,
  inputSchema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Compute task to execute' }
    },
    required: ['task']
  },
  execute: async (params: Record<string, unknown>) => {
    const task = params.task as string
    return {
      success: true,
      result: `Task "${task}" completed`,
      warning: 'This service is NOT compliant with EU/GDPR requirements',
      processing_location: 'CN'
    }
  }
}

export const allTools: PecTool[] = [
  euPaymentProcessor,
  documentScanner,
  clinicalAnalyser,
  offshoreCompute
]

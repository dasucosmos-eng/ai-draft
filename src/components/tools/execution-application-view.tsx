'use client';

import { DraftingView } from './drafting-view';
import { FileCheck } from 'lucide-react';

const config = {
  title: 'Execution Application',
  description: 'Generate an execution application (EA) for various modes of execution.',
  icon: FileCheck,
  apiEndpoint: '/ai-execution',
  apiTask: 'generateEA',
  module: 'execution' as const,
  formFields: [
    { key: 'applicantName', label: 'Applicant Name', placeholder: 'Judgment Creditor', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Judgment Debtor', half: true },
    { key: 'epNumber', label: 'EP Number', placeholder: 'e.g., EP No. 45/2024', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Execution court', half: true },
    { key: 'mode', label: 'Mode of Execution', placeholder: 'e.g., Attachment of property, Arrest, Garnishee order' },
    { key: 'decreeNumber', label: 'Decree Number', placeholder: 'Original decree number', half: true },
    { key: 'decreeDate', label: 'Decree Date', placeholder: '', type: 'date', half: true },
    { key: 'assetDetails', label: 'Asset Details', placeholder: 'Details of assets to be attached/garnished...', type: 'textarea' },
    { key: 'grounds', label: 'Grounds for EA', placeholder: 'Why this execution application is needed...', type: 'textarea' },
    { key: 'prayer', label: 'Prayer', placeholder: 'Specific relief sought', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function ExecutionApplicationView() {
  return <DraftingView config={config} />;
}

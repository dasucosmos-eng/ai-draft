'use client';

import { DraftingView } from './drafting-view';
import { Gavel } from 'lucide-react';

const config = {
  title: 'Execution Petition',
  description: 'Generate an execution petition to enforce a court decree.',
  icon: Gavel,
  apiEndpoint: '/ai-execution',
  apiTask: 'generateEP',
  module: 'execution' as const,
  requiredFields: ['decreeHolderName', 'judgmentDebtorName', 'decreeDate'],
  formFields: [
    { key: 'decreeHolderName', label: 'Decree Holder Name', placeholder: 'Judgment Creditor', half: true },
    { key: 'judgmentDebtorName', label: 'Judgment Debtor Name', placeholder: 'Name of the judgment debtor', half: true },
    { key: 'decreeNumber', label: 'Decree Number', placeholder: 'e.g., Decree No. 123/2024', half: true },
    { key: 'decreeDate', label: 'Decree Date', placeholder: '', type: 'date' as const, half: true },
    { key: 'courtName', label: 'Decreeing Court', placeholder: 'Court that passed the decree', half: true },
    { key: 'executionCourt', label: 'Execution Court', placeholder: 'Court where EP is filed', half: true },
    { key: 'amountDecreed', label: 'Amount Decreed (₹)', placeholder: 'Total amount', type: 'number' as const, half: true },
    { key: 'amountDue', label: 'Amount Due (₹)', placeholder: 'Amount still outstanding', type: 'number' as const, half: true },
    { key: 'decreeSummary', label: 'Decree Summary', placeholder: 'Summary of the decree terms...', type: 'textarea' as const },
    { key: 'executionDetails', label: 'Execution Details', placeholder: 'Mode of execution, assets, properties...', type: 'textarea' as const },
    { key: 'grounds', label: 'Grounds', placeholder: 'Why execution is needed now', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function ExecutionPetitionView() {
  return <DraftingView config={config} />;
}

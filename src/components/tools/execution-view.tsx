'use client';

import { DraftingView } from './drafting-view';
import { Gavel } from 'lucide-react';

const config = {
  title: 'Execution Matters',
  description: 'Generate execution petitions and applications. Upload a decree or describe the execution needed — AI drafts automatically.',
  icon: Gavel,
  apiEndpoint: '/ai-execution',
  apiTask: 'generateDocument',
  module: 'execution' as const,
  formFields: [
    { key: 'decreeNumber', label: 'Decree Number', placeholder: 'e.g., Decree No. 123/2024', half: true },
    { key: 'courtName', label: 'Court', placeholder: 'Court that passed the decree', half: true },
    { key: 'judgmentDebtor', label: 'Judgment Debtor', placeholder: 'Name of judgment debtor', half: true },
    { key: 'judgmentCreditor', label: 'Judgment Creditor', placeholder: 'Name of judgment creditor', half: true },
    { key: 'amount', label: 'Amount (₹)', placeholder: 'Decree amount', type: 'number' as const, half: true },
    { key: 'decreeDate', label: 'Decree Date', placeholder: '', type: 'date' as const, half: true },
    { key: 'facts', label: 'Description', placeholder: 'Describe the decree and what execution is needed...', type: 'textarea' as const },
    { key: 'reliefSought', label: 'Execution Relief', placeholder: 'What execution relief is sought?', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function ExecutionView() {
  return <DraftingView config={config} />;
}

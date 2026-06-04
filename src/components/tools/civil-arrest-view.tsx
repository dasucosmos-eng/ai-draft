'use client';

import { DraftingView } from './drafting-view';
import { UserX } from 'lucide-react';

const config = {
  title: 'Civil Arrest Application',
  description: 'Draft an application for civil arrest of judgment debtor.',
  icon: UserX,
  apiEndpoint: '/ai-execution',
  apiTask: 'generateEA',
  module: 'execution' as const,
  formFields: [
    { key: 'decreeHolderName', label: 'Decree Holder', placeholder: 'Judgment Creditor name', half: true },
    { key: 'debtorName', label: 'Judgment Debtor', placeholder: 'Person to be arrested', half: true },
    { key: 'epNumber', label: 'EP Number', placeholder: 'Execution Petition number', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Execution court', half: true },
    { key: 'decreeNumber', label: 'Decree Number', placeholder: 'Original decree', half: true },
    { key: 'decreeAmount', label: 'Decree Amount (₹)', placeholder: 'Amount of decree', type: 'number' as const, half: true },
    { key: 'grounds', label: 'Grounds for Arrest', placeholder: 'Why civil arrest is needed - hiding assets, non-cooperation...', type: 'textarea' as const },
    { key: 'debtorAddress', label: 'Debtor Address', placeholder: 'Last known address of the debtor', type: 'textarea' as const },
    { key: 'prayer', label: 'Prayer', placeholder: 'Specific prayer for arrest warrant', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function CivilArrestView() {
  return <DraftingView config={config} />;
}

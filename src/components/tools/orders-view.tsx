'use client';

import { DraftingView } from './drafting-view';
import { FileText } from 'lucide-react';

const config = {
  title: 'Orders / Issues Parser',
  description: 'Upload and analyze court orders to extract issues and directions.',
  icon: FileText,
  apiEndpoint: '/ai-civil',
  apiTask: 'parseIssues',
  module: 'civil' as const,
  formFields: [
    { key: 'orderText', label: 'Order Text', placeholder: 'Paste the full text of the court order here...', type: 'textarea' },
    { key: 'courtName', label: 'Court Name', placeholder: 'Name of the court', half: true },
    { key: 'caseNumber', label: 'Case Number', placeholder: 'e.g., CS No. 123/2024', half: true },
    { key: 'additionalNotes', label: 'Additional Notes', placeholder: 'Specific aspects to focus on', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.analysis || res.draft || JSON.stringify(res, null, 2),
};

export function OrdersView() {
  return <DraftingView config={config} />;
}

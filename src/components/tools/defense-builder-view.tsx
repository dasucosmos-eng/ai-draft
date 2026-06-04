'use client';

import { DraftingView } from './drafting-view';
import { Shield } from 'lucide-react';

const config = {
  title: 'Defense Builder',
  description: 'Build defense arguments and strategies with AI. Upload case documents or describe the prosecution\'s case — AI builds the defense autonomously.',
  icon: Shield,
  apiEndpoint: '/ai-litigation',
  apiTask: 'defense-builder',
  module: 'criminal' as const,
  formFields: [
    { key: 'accusedName', label: 'Accused Name', placeholder: 'Name of accused', half: true },
    { key: 'sectionsCharged', label: 'Sections Charged', placeholder: 'e.g., 304, 279 IPC', half: true },
    { key: 'firNumber', label: 'FIR Number', placeholder: 'FIR No. if applicable', half: true },
    { key: 'courtName', label: 'Court', placeholder: 'Court name', half: true },
    { key: 'prosecutionCase', label: 'Prosecution\'s Case', placeholder: 'Describe the prosecution\'s allegations and evidence...', type: 'textarea' },
    { key: 'facts', label: 'Defense Facts', placeholder: 'Facts from defense perspective, contradictions in prosecution case...', type: 'textarea' },
    { key: 'grounds', label: 'Legal Grounds', placeholder: 'Legal provisions, precedents, and grounds for defense...', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function DefenseBuilderView() {
  return <DraftingView config={config} />;
}

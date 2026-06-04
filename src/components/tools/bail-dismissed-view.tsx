'use client';

import { DraftingView } from './drafting-view';
import { ShieldX } from 'lucide-react';

const config = {
  title: 'Opposition to Bail Application',
  description: 'Draft opposition arguments when bail is sought by the accused.',
  icon: ShieldX,
  apiEndpoint: '/ai-draft',
  documentType: 'Opposition to Bail Application',
  module: 'criminal' as const,
  formFields: [
    { key: 'prosecutorName', label: 'Prosecutor / Complainant', placeholder: 'Name of prosecutor or complainant', half: true },
    { key: 'accusedName', label: 'Accused Name', placeholder: 'Name of accused seeking bail', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court name', half: true },
    { key: 'caseNumber', label: 'Case Number', placeholder: 'CC/SC No.', half: true },
    { key: 'firNumber', label: 'FIR Number', placeholder: 'FIR number', half: true },
    { key: 'sectionsCharged', label: 'Sections Charged', placeholder: 'Sections', half: true },
    { key: 'oppositionGrounds', label: 'Grounds for Opposition', placeholder: 'Why bail should not be granted - flight risk, tampering, serious offence...', type: 'textarea' as const },
    { key: 'facts', label: 'Relevant Facts', placeholder: 'Facts supporting opposition', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function BailDismissedView() {
  return <DraftingView config={config} />;
}

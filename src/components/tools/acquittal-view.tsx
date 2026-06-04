'use client';

import { DraftingView } from './drafting-view';
import { CheckCircle } from 'lucide-react';

const config = {
  title: 'Arguments for Acquittal',
  description: 'Draft arguments supporting acquittal of the accused.',
  icon: CheckCircle,
  apiEndpoint: '/ai-draft',
  documentType: 'Arguments for Acquittal',
  module: 'criminal' as const,
  formFields: [
    { key: 'accusedName', label: 'Accused Name', placeholder: 'Name of the accused', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court name', half: true },
    { key: 'caseNumber', label: 'Case Number', placeholder: 'Case number', half: true },
    { key: 'sectionsCharged', label: 'Sections Charged', placeholder: 'IPC/CrPC sections', half: true },
    { key: 'prosecutionCase', label: 'Prosecution Case Summary', placeholder: 'Summary of prosecution evidence and arguments', type: 'textarea' as const },
    { key: 'defenseArguments', label: 'Defense Arguments', placeholder: 'Why the accused should be acquitted...', type: 'textarea' as const },
    { key: 'witnesses', label: 'Witness Analysis', placeholder: 'Analysis of prosecution witnesses and their statements', type: 'textarea' as const },
    { key: 'evidence', label: 'Evidence Analysis', placeholder: 'Documentary/circumstantial evidence analysis', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function AcquittalView() {
  return <DraftingView config={config} />;
}

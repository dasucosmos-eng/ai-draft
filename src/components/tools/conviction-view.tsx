'use client';

import { DraftingView } from './drafting-view';
import { AlertTriangle } from 'lucide-react';

const config = {
  title: 'Arguments for Conviction & Sentencing',
  description: 'Draft arguments supporting conviction and appropriate sentencing.',
  icon: AlertTriangle,
  apiEndpoint: '/ai-draft',
  documentType: 'Arguments for Conviction and Sentencing',
  module: 'criminal' as const,
  formFields: [
    { key: 'prosecutorName', label: 'Prosecutor Name', placeholder: 'Name of prosecutor', half: true },
    { key: 'accusedName', label: 'Accused Name', placeholder: 'Name of the accused', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court name', half: true },
    { key: 'caseNumber', label: 'Case Number', placeholder: 'Case number', half: true },
    { key: 'sectionsCharged', label: 'Sections Charged', placeholder: 'IPC sections', half: true },
    { key: 'prosecutionEvidence', label: 'Prosecution Evidence', placeholder: 'Summary of evidence against the accused', type: 'textarea' },
    { key: 'convictionArguments', label: 'Arguments for Conviction', placeholder: 'Why conviction is warranted...', type: 'textarea' },
    { key: 'sentencingArguments', label: 'Sentencing Arguments', placeholder: 'Appropriate sentence considering severity, precedent...', type: 'textarea' },
    { key: 'victimImpact', label: 'Victim Impact Statement', placeholder: 'Impact on victim / family', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function ConvictionView() {
  return <DraftingView config={config} />;
}

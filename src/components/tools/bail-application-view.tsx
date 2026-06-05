'use client';

import { DraftingView } from './drafting-view';
import { ShieldCheck } from 'lucide-react';

const config = {
  title: 'Bail Application',
  description: 'Draft a bail application (regular bail / anticipatory bail).',
  icon: ShieldCheck,
  apiEndpoint: '/ai-criminal',
  apiTask: 'generateBail',
  module: 'criminal' as const,
  requiredFields: ['applicantName', 'firNumber'],
  formFields: [
    { key: 'applicantName', label: 'Applicant Name', placeholder: 'Name of accused', half: true },
    { key: 'age', label: 'Age', placeholder: 'Age of accused', half: true },
    { key: 'bailType', label: 'Bail Type', placeholder: 'Regular Bail / Anticipatory Bail / Default Bail' },
    { key: 'firNumber', label: 'FIR Number', placeholder: 'e.g., FIR No. 456/2024', half: true },
    { key: 'policeStation', label: 'Police Station', placeholder: 'Name of PS', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court where bail is sought', half: true },
    { key: 'sectionsCharged', label: 'Sections Charged', placeholder: 'e.g., 302, 201, 34 IPC', half: true },
    { key: 'arrestDate', label: 'Date of Arrest', placeholder: '', type: 'date' as const, half: true },
    { key: 'grounds', label: 'Grounds for Bail', placeholder: 'Why bail should be granted - no criminal history, no tampering, etc.', type: 'textarea' as const },
    { key: 'facts', label: 'Case Facts', placeholder: 'Brief facts of the case', type: 'textarea' as const },
    { key: 'sureties', label: 'Surety Details', placeholder: 'Number and details of proposed sureties', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function BailApplicationView() {
  return <DraftingView config={config} />;
}

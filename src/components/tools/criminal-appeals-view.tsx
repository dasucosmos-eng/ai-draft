'use client';

import { DraftingView } from './drafting-view';
import { ArrowUpRight } from 'lucide-react';

const config = {
  title: 'Criminal Appeals',
  description: 'Draft a criminal appeal against conviction or acquittal.',
  icon: ArrowUpRight,
  apiEndpoint: '/ai-criminal',
  apiTask: 'generateCriminalAppeal',
  module: 'criminal' as const,
  formFields: [
    { key: 'appellantName', label: 'Appellant Name', placeholder: 'Name of appellant', half: true },
    { key: 'respondentName', label: 'Respondent (State)', placeholder: 'State / Complainant', half: true },
    { key: 'lowerCourt', label: 'Trial Court', placeholder: 'Court that passed the judgment', half: true },
    { key: 'appellateCourt', label: 'Appellate Court', placeholder: 'e.g., Sessions Court / High Court', half: true },
    { key: 'firNumber', label: 'FIR Number', placeholder: 'e.g., FIR No. 123/2024', half: true },
    { key: 'policeStation', label: 'Police Station', placeholder: 'Name of police station', half: true },
    { key: 'convictionDate', label: 'Conviction/Order Date', placeholder: '', type: 'date' as const, half: true },
    { key: 'sectionsCharged', label: 'Sections Charged', placeholder: 'e.g., Section 302, 201 IPC', half: true },
    { key: 'sentence', label: 'Sentence Awarded', placeholder: 'e.g., Life imprisonment, 10 years RI', half: true },
    { key: 'impugnedOrder', label: 'Impugned Order Summary', placeholder: 'Summary of the judgment being appealed...', type: 'textarea' as const },
    { key: 'groundsOfAppeal', label: 'Grounds of Appeal', placeholder: 'Detailed grounds for appeal...', type: 'textarea' as const },
    { key: 'facts', label: 'Relevant Facts', placeholder: 'Brief facts of the case', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function CriminalAppealsView() {
  return <DraftingView config={config} />;
}

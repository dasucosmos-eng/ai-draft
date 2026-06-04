'use client';

import { DraftingView } from './drafting-view';
import { ArrowUpRight } from 'lucide-react';

const config = {
  title: 'Civil Appeal Suit',
  description: 'Draft a civil appeal against a lower court decree/order.',
  icon: ArrowUpRight,
  apiEndpoint: '/ai-civil',
  apiTask: 'generateAppeal',
  module: 'civil' as const,
  formFields: [
    { key: 'appellantName', label: 'Appellant Name', placeholder: 'Name of the appellant', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Name of the respondent', half: true },
    { key: 'lowerCourt', label: 'Lower Court', placeholder: 'Court that passed the decree', half: true },
    { key: 'appealCourt', label: 'Appellate Court', placeholder: 'e.g., High Court', half: true },
    { key: 'decreeDate', label: 'Decree/Order Date', placeholder: '', type: 'date' as const, half: true },
    { key: 'suitNumber', label: 'Original Suit No.', placeholder: 'e.g., CS No. 456/2023', half: true },
    { key: 'impugnedOrder', label: 'Impugned Order Summary', placeholder: 'Summary of the order being appealed', type: 'textarea' as const },
    { key: 'groundsOfAppeal', label: 'Grounds of Appeal', placeholder: 'List the grounds for appeal...', type: 'textarea' as const },
    { key: 'facts', label: 'Relevant Facts', placeholder: 'Brief facts of the case', type: 'textarea' as const },
    { key: 'reliefSought', label: 'Relief Sought in Appeal', placeholder: 'What relief is sought', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function AppealSuitView() {
  return <DraftingView config={config} />;
}

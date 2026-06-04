'use client';

import { DraftingView } from './drafting-view';
import { Scroll } from 'lucide-react';

const config = {
  title: 'Decree & Judgment Parser',
  description: 'Upload and parse a decree or judgment to extract key details.',
  icon: Scroll,
  apiEndpoint: '/ai-execution',
  apiTask: 'parseDecree',
  module: 'execution' as const,
  formFields: [
    { key: 'decreeText', label: 'Decree/Judgment Text', placeholder: 'Paste the full text of the decree or judgment here for AI analysis...', type: 'textarea' },
    { key: 'courtName', label: 'Court Name', placeholder: 'Name of the court', half: true },
    { key: 'caseType', label: 'Case Type', placeholder: 'Civil / Criminal / Family', half: true },
    { key: 'additionalNotes', label: 'Additional Notes', placeholder: 'Any specific aspects to focus on', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.analysis || res.draft || JSON.stringify(res, null, 2),
};

export function DecreeJudgementView() {
  return <DraftingView config={config} />;
}

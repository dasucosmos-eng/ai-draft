'use client';

import { DraftingView } from './drafting-view';
import { MessageSquare } from 'lucide-react';

const config = {
  title: 'Written Arguments',
  description: 'Draft detailed written arguments for submission in court.',
  icon: MessageSquare,
  apiEndpoint: '/ai-civil',
  apiTask: 'generateWrittenArguments',
  module: 'civil' as const,
  formFields: [
    { key: 'caseTitle', label: 'Case Title', placeholder: 'e.g., ABC v. XYZ', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Court name', half: true },
    { key: 'partyPosition', label: 'Party Position', placeholder: 'e.g., Plaintiff / Defendant / Appellant' },
    { key: 'issues', label: 'Issues for Determination', placeholder: 'List the key issues to be argued...', type: 'textarea' },
    { key: 'facts', label: 'Material Facts', placeholder: 'Brief facts of the case', type: 'textarea' },
    { key: 'arguments', label: 'Key Arguments', placeholder: 'Main arguments to be elaborated...', type: 'textarea' },
    { key: 'caseLaws', label: 'Case Laws / Precedents', placeholder: 'Relevant case laws to cite', type: 'textarea' },
    { key: 'conclusion', label: 'Prayer / Conclusion', placeholder: 'Summary and conclusion', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function WrittenArgumentsView() {
  return <DraftingView config={config} />;
}

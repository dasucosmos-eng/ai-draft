'use client';

import { DraftingView } from './drafting-view';
import { Scroll } from 'lucide-react';

const config = {
  title: 'Writ Petition',
  description: 'Draft a writ petition (Habeas Corpus, Mandamus, Prohibition, Certiorari, Quo Warranto).',
  icon: Scroll,
  apiEndpoint: '/ai-criminal',
  apiTask: 'generateWrit',
  module: 'criminal' as const,
  formFields: [
    { key: 'petitionerName', label: 'Petitioner Name', placeholder: 'Name of petitioner', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'State / Authority', half: true },
    { key: 'writType', label: 'Type of Writ', placeholder: 'Habeas Corpus / Mandamus / Prohibition / Certiorari / Quo Warranto' },
    { key: 'courtName', label: 'Court Name', placeholder: 'High Court / Supreme Court', half: true },
    { key: 'publicAuthority', label: 'Public Authority', placeholder: 'Name of the authority against whom writ is filed', half: true },
    { key: 'impugnedOrder', label: 'Impugned Action/Order', placeholder: 'What action or order is being challenged', type: 'textarea' },
    { key: 'grounds', label: 'Grounds for Writ', placeholder: 'Constitutional violation, illegality, procedural impropriety...', type: 'textarea' },
    { key: 'facts', label: 'Relevant Facts', placeholder: 'Detailed facts leading to the writ', type: 'textarea' },
    { key: 'fundamentalRights', label: 'Fundamental Rights Violated', placeholder: 'e.g., Article 21, Article 14, Article 19...', type: 'textarea' },
    { key: 'prayer', label: 'Prayer / Relief Sought', placeholder: 'Specific writ relief sought', type: 'textarea' },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function WritPetitionView() {
  return <DraftingView config={config} />;
}

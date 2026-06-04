'use client';

import { DraftingView } from './drafting-view';
import { Heart } from 'lucide-react';

const config = {
  title: 'HMOP / Divorce Petition',
  description: 'Draft a Hindu Marriage Opposition Petition or Divorce Petition.',
  icon: Heart,
  apiEndpoint: '/ai-family',
  apiTask: 'generateDivorce',
  module: 'family' as const,
  formFields: [
    { key: 'petitionerName', label: 'Petitioner Name', placeholder: 'Spouse filing the petition', half: true },
    { key: 'respondentName', label: 'Respondent Name', placeholder: 'Other spouse', half: true },
    { key: 'petitionerAge', label: 'Petitioner Age', placeholder: 'Age', half: true },
    { key: 'respondentAge', label: 'Respondent Age', placeholder: 'Age', half: true },
    { key: 'marriageDate', label: 'Date of Marriage', placeholder: '', type: 'date' as const, half: true },
    { key: 'marriagePlace', label: 'Place of Marriage', placeholder: 'Where married', half: true },
    { key: 'children', label: 'Children Details', placeholder: 'Names and ages of children', half: true },
    { key: 'petitionType', label: 'Petition Type', placeholder: 'Divorce / Judicial Separation / Restitution of Conjugal Rights', half: true },
    { key: 'courtName', label: 'Court Name', placeholder: 'Family court / District court' },
    { key: 'grounds', label: 'Grounds for Divorce', placeholder: 'Cruelty, desertion, adultery, mutual consent, irretrievable breakdown...', type: 'textarea' as const },
    { key: 'facts', label: 'Material Facts', placeholder: 'Detailed facts and circumstances...', type: 'textarea' as const },
    { key: 'reliefSought', label: 'Relief Sought', placeholder: 'e.g., Divorce, custody, maintenance, alimony', type: 'textarea' as const },
  ],
  getResultContent: (res: any) => res.content || res.responseText || res.draft || JSON.stringify(res, null, 2),
};

export function HmopView() {
  return <DraftingView config={config} />;
}

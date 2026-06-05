import { apiCall, getAuthToken } from './api-client';

export async function aiChat(message: string, history: Array<{ role: string; content: string }>, caseContext?: any) {
  return apiCall('/ai-chat', { message, history, caseContext }, getAuthToken() || undefined);
}

export async function aiDraft(caseType: string, documentType: string, details: any, caseContext?: any) {
  return apiCall('/ai-draft', { caseType, documentType, details, caseContext }, getAuthToken() || undefined);
}

export async function aiDocument(documentContent: string) {
  return apiCall('/ai-document', { documentContent }, getAuthToken() || undefined);
}

export async function aiIntake(description: string, filesContent?: string) {
  return apiCall('/ai-intake', { description, filesContent }, getAuthToken() || undefined);
}

export async function aiResearch(query: string, court?: string, year?: string, caseType?: string) {
  return apiCall('/ai-research', { query, court, year, caseType }, getAuthToken() || undefined);
}

export async function aiLitigation(toolType: string, input: any) {
  return apiCall('/ai-litigation', { toolType, input }, getAuthToken() || undefined);
}

export async function aiExtractFile(fileData: string, fileName: string, mimeType: string) {
  return apiCall('/ai-extract-file', { fileData, fileName, mimeType }, getAuthToken() || undefined);
}

export async function aiExtractData(text: string, extractionType: string) {
  return apiCall('/ai-extract-data', { text, extractionType }, getAuthToken() || undefined);
}

export async function aiCivil(input: any) {
  return apiCall('/ai-civil', input, getAuthToken() || undefined);
}

export async function aiCriminal(input: any) {
  return apiCall('/ai-criminal', input, getAuthToken() || undefined);
}

export async function aiExecution(input: any) {
  return apiCall('/ai-execution', input, getAuthToken() || undefined);
}

export async function aiFamily(input: any) {
  return apiCall('/ai-family', input, getAuthToken() || undefined);
}

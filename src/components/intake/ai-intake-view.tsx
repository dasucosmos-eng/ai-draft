'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { apiCall, getAuthToken } from '@/lib/api-client';
import { useDataStore } from '@/store/data-store';
import { useAppStore } from '@/store/app-store';
import { useClientsStore } from '@/store/clients-store';
import { v4 as uuidv4 } from 'uuid';
import {
  Loader2, Sparkles, FilePlus, FileText, Briefcase, AlertCircle, Upload, X, CheckCircle2, Users,
  Phone, MapPin, Scale, ShieldCheck, ChevronRight, Zap, CheckCircle, UserPlus, RotateCcw,
  Eye, Pencil, FileDown, Download
} from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';
import { DocumentViewer } from '@/components/shared/document-viewer';
import { generatePDF, downloadPDF } from '@/lib/pdf-generator';
import type { CaseItem, Client } from '@/lib/types';

interface ExtractedCaseData {
  caseTitle?: string;
  caseType?: string;
  subType?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  opposingParty?: string;
  opposingPartyAddress?: string;
  accusedName?: string;
  accusedPhone?: string;
  accusedAddress?: string;
  victimNames?: string[];
  addresses?: string;
  phone?: string;
  email?: string;
  sections?: string[];
  causeOfAction?: string;
  reliefSought?: string;
  firNumber?: string;
  policeStation?: string;
  courtName?: string;
  jurisdiction?: string;
  facts?: string;
  priority?: string;
  suggestedDocuments?: Array<{ name: string; type: string }>;
  nextSteps?: Array<{ step: number; action: string; timeline: string }>;
}

interface UploadedFile {
  name: string;
  size: string;
  text: string;
  status: 'done' | 'error';
}

interface GeneratedDraft {
  name: string;
  type: string;
  content: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

type IntakeStage = 'idle' | 'uploading' | 'analyzing' | 'extracted' | 'creating-case' | 'drafting' | 'complete';

// Generate a markdown summary from extracted case data
function generateSummary(data: ExtractedCaseData): string {
  const lines: string[] = [];
  if (data.caseType) lines.push(`**Case Type:** ${data.caseType}${data.subType ? ` (${data.subType})` : ''}`);
  if (data.clientName) lines.push(`**Client:** ${data.clientName}${data.clientPhone ? ` - ${data.clientPhone}` : ''}${data.clientEmail ? ` - ${data.clientEmail}` : ''}`);
  if (data.opposingParty) lines.push(`**Opposing Party:** ${data.opposingParty}${data.opposingPartyAddress ? ` - ${data.opposingPartyAddress}` : ''}`);
  if (data.accusedName) lines.push(`**Accused:** ${data.accusedName}${data.accusedPhone ? ` - ${data.accusedPhone}` : ''}`);
  if (data.courtName) lines.push(`**Court:** ${data.courtName}`);
  if (data.jurisdiction) lines.push(`**Jurisdiction:** ${data.jurisdiction}`);
  if (data.firNumber) lines.push(`**FIR:** ${data.firNumber}${data.policeStation ? ` - ${data.policeStation}` : ''}`);
  if (data.sections && data.sections.length > 0) lines.push(`**Sections:** ${data.sections.join(', ')}`);
  if (data.priority) lines.push(`**Priority:** ${data.priority.toUpperCase()}`);
  if (data.causeOfAction) lines.push(`\n**Cause of Action:**\n${data.causeOfAction}`);
  if (data.reliefSought) lines.push(`\n**Relief Sought:**\n${data.reliefSought}`);
  if (data.facts) lines.push(`\n**Facts:**\n${data.facts}`);
  if (data.suggestedDocuments && data.suggestedDocuments.length > 0) {
    lines.push(`\n**Suggested Documents (${data.suggestedDocuments.length}):**`);
    data.suggestedDocuments.forEach((doc, i) => {
      lines.push(`${i + 1}. ${doc.name} (${doc.type})`);
    });
  }
  if (data.nextSteps && data.nextSteps.length > 0) {
    lines.push(`\n**Next Steps:**`);
    data.nextSteps.forEach((step) => {
      const action = typeof step === 'string' ? step : step.action;
      const timeline = typeof step === 'object' && step.timeline ? ` (${step.timeline})` : '';
      lines.push(`- ${action}${timeline}`);
    });
  }
  return lines.length > 0 ? lines.join('\n') : 'No summary data available yet. Upload documents or describe the case to begin analysis.';
}

export function AiIntakeView() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedCaseData>({});
  const [editMode, setEditMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [extractedTexts, setExtractedTexts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addCase = useDataStore((s) => s.addCase);
  const addDocument = useDataStore((s) => s.addDocument);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const addClient = useClientsStore((s) => s.addClient);

  // Autonomous flow state
  const [stage, setStage] = useState<IntakeStage>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<GeneratedDraft[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // FILE UPLOAD with auto-trigger analysis
  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStage('uploading');
    setProgress(10);
    setProgressLabel('Reading documents...');
    setUploadingFile(true);
    const newFiles: UploadedFile[] = [];
    const texts: string[] = [];

    for (const file of Array.from(files)) {
      try {
        setProgressLabel(`Extracting: ${file.name}`);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const token = getAuthToken();
        const extractRes = await apiCall('/ai-extract-file', {
          fileData: base64,
          mimeType: file.type,
          fileName: file.name,
        }, token || undefined);

        const text = extractRes.text || extractRes.content || '';
        texts.push(text);
        newFiles.push({ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, text, status: 'done' });
      } catch (err: any) {
        newFiles.push({ name: file.name, size: '-', text: '', status: 'error' });
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setExtractedTexts(texts);
    setUploadingFile(false);
    setProgress(40);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // AUTO-TRIGGER: Analyze immediately after upload
    if (newFiles.some(f => f.status === 'done')) {
      await autoAnalyze(texts, newFiles);
    } else {
      setStage('idle');
    }
  };

  // AUTO-ANALYZE: Called automatically after file upload, or manually via "Analyze & Auto-Create"
  const autoAnalyze = async (texts?: string[], newlyUploaded?: UploadedFile[]) => {
    if (!description.trim() && (!texts || texts.length === 0) && uploadedFiles.filter(f => f.status === 'done').length === 0) {
      toast.error('Please upload documents or describe the case');
      setStage('idle');
      return;
    }

    setLoading(true);
    setResult(null);
    setError('');
    setStage('analyzing');
    setProgress(50);
    setProgressLabel('AI analyzing case details...');

    try {
      const token = getAuthToken();
      const filesContent = (texts || extractedTexts).length > 0 ? (texts || extractedTexts).join('\n\n---\n\n') : undefined;
      const res = await apiCall('/ai-intake', {
        description,
        filesContent,
      }, token || undefined);

      setProgress(70);
      setResult(res);

      // Backend returns: { data: { caseClassification, extractedInfo, suggestedDocuments, nextSteps }, _provider }
      const aiData = res.data || {};
      const extracted = aiData.extractedInfo || {};
      const classification = aiData.caseClassification || {};

      // Merge extracted data from both sources
      const mergedData: ExtractedCaseData = {
        caseTitle: extracted.caseTitle || classification.caseType || '',
        caseType: classification.caseType || extracted.caseType || '',
        subType: classification.subType || extracted.subType || '',
        clientName: extracted.parties?.[0]?.name || extracted.clientName || '',
        clientPhone: extracted.parties?.[0]?.phone || extracted.phone || '',
        clientEmail: extracted.parties?.[0]?.email || extracted.email || '',
        clientAddress: extracted.parties?.[0]?.address || extracted.addresses || '',
        opposingParty: extracted.opposingParties?.[0]?.name || extracted.opposingParty || '',
        opposingPartyAddress: extracted.opposingParties?.[0]?.address || '',
        accusedName: extracted.accusedName || '',
        accusedPhone: extracted.accusedPhone || '',
        accusedAddress: extracted.accusedAddress || '',
        victimNames: extracted.victims || [],
        sections: classification.relevantSections || extracted.caseDetails?.underSections || extracted.sections || [],
        causeOfAction: extracted.caseDetails?.causeOfAction || extracted.causeOfAction || '',
        reliefSought: extracted.caseDetails?.reliefSought || extracted.reliefSought || '',
        firNumber: extracted.caseDetails?.firNumber || extracted.firNumber || '',
        policeStation: extracted.caseDetails?.policeStation || extracted.policeStation || '',
        courtName: classification.courtName || extracted.caseDetails?.courtName || '',
        jurisdiction: classification.jurisdiction || extracted.jurisdiction || '',
        facts: Array.isArray(extracted.caseDetails?.facts) ? extracted.caseDetails.facts.join('\n') : extracted.facts || '',
        priority: classification.priority || 'medium',
        suggestedDocuments: aiData.suggestedDocuments || [],
        nextSteps: aiData.nextSteps || [],
      };
      
      setExtractedData(mergedData);
      setProgress(80);
      setProgressLabel('Case analyzed');
      setStage('extracted');

      // AUTO-CREATE: Automatically create case + client + draft documents
      // Pass the current uploaded files (including newly uploaded ones via ref) to avoid stale closure
      await autoCreateCaseAndDraft(mergedData, filesContent || (texts || extractedTexts).join('\n\n---\n\n'), newlyUploaded);
    } catch (err: any) {
      setError(err?.message || 'Analysis failed');
      setStage('idle');
      toast.error(err?.message || 'Analysis failed');
    }
    setLoading(false);
  };

  // AUTO-CREATE CASE + CLIENT + DRAFT ALL DOCUMENTS
  const autoCreateCaseAndDraft = async (data: ExtractedCaseData, fileContent: string, currentNewFiles?: UploadedFile[]) => {
    setStage('creating-case');
    setProgress(85);
    setProgressLabel('Creating case and client...');

    try {
      // 1. Create Client
      const clientId = uuidv4();
      const client: Client = {
        id: clientId,
        name: data.clientName || 'Unknown Client',
        phone: data.clientPhone || data.phone || '',
        email: data.clientEmail || data.email || '',
        address: data.clientAddress || data.addresses || '',
        category: 'individual',
        accused: data.accusedName ? [data.accusedName] : [],
        victims: data.victimNames || [],
        caseIds: [],
        documents: [],
        fees: [],
        activities: [],
        importantDates: [],
        tags: [data.caseType || ''],
        notes: `Auto-created from AI intake. ${data.caseType ? `Case type: ${data.caseType}.` : ''} ${data.firNumber ? `FIR: ${data.firNumber}.` : ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addClient(client);
      setCreatedClientId(clientId);

      // 2. Create Case
      const caseId = uuidv4();
      const caseItem: CaseItem = {
        id: caseId,
        title: data.caseTitle || data.caseType || description.slice(0, 80) || 'New Case',
        description: data.facts || description,
        caseType: data.caseType || 'Civil',
        subType: data.subType,
        status: 'active',
        priority: data.priority || 'medium',
        jurisdiction: data.jurisdiction || '',
        courtName: data.courtName || '',
        clientName: data.clientName || '',
        clientPhone: data.clientPhone || '',
        opposingParty: data.opposingParty || '',
        opposingPartyAddress: data.opposingPartyAddress || '',
        accusedName: data.accusedName || '',
        accusedPhone: data.accusedPhone || '',
        accusedAddress: data.accusedAddress || '',
        accusedEmail: '',
        victimNames: data.victimNames || [],
        underSections: data.sections || [],
        causeOfAction: data.causeOfAction || '',
        reliefSought: data.reliefSought || '',
        firNumber: data.firNumber || '',
        policeStation: data.policeStation || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addCase(caseItem);
      setCreatedCaseId(caseId);

      // Save uploaded files as documents
      // Use currentNewFiles (from current upload) + existing uploadedFiles to avoid stale closure
      const filesToSave = currentNewFiles || uploadedFiles;
      filesToSave.filter((f) => f.status === 'done').forEach((f) => {
        addDocument({
          id: uuidv4(),
          name: f.name,
          type: 'source',
          category: 'intake',
          content: f.text.substring(0, 10000),
          caseId,
          createdAt: new Date().toISOString(),
        });
      });

      // 3. AUTO-DRAFT ALL suggested documents
      if (data.suggestedDocuments && data.suggestedDocuments.length > 0) {
        // Create abort controller so drafting can be cancelled on unmount/reset
        const abortController = new AbortController();
        abortRef.current = abortController;

        setStage('drafting');
        setProgressLabel(`Generating ${data.suggestedDocuments.length} documents...`);
        
        // Draft documents SEQUENTIALLY with 3s delay between each
        // to avoid hitting API rate limits
        const completedDrafts: GeneratedDraft[] = [];
        for (let idx = 0; idx < data.suggestedDocuments.length; idx++) {
          // Check if drafting was cancelled
          if (abortController.signal.aborted) break;
          const doc = data.suggestedDocuments[idx];
          if (idx > 0) {
            // Wait 3 seconds between documents to avoid rate limits
            await new Promise(r => setTimeout(r, 3000));
          }
          try {
            setProgress(85 + Math.floor(((idx + 1) / data.suggestedDocuments.length) * 15));
            setProgressLabel(`Drafting: ${doc.name} (${idx + 1}/${data.suggestedDocuments.length})`);
            
            // Route to the correct API based on document type
            let endpoint = '/ai-draft';
            let body: any = {
              documentType: doc.name,
              caseType: data.caseType,
              details: {
                ...data,
                caseId,
                clientId,
              },
              extractedText: fileContent || '',
            };

            // NOTE: Do NOT route to specialized endpoints (ai-criminal, ai-civil, ai-family)
            // here. Those require specific structured input (bailType, matterFacts, etc.)
            // that the intake auto-draft doesn't provide. They don't support a generic
            // 'generateDocument' task. Use /ai-draft which accepts generic documentType + details.

            const token = getAuthToken();
            const draftRes = await apiCall(endpoint, body, token || undefined);
            // Handle response format: { success, data: { content } } or { content }
            const content = draftRes.data?.content || draftRes.content || draftRes.responseText || draftRes.draft || '';
            if (!content) {
              throw new Error('Empty response from drafting endpoint');
            }

            // Save the generated document to the case
            addDocument({
              id: uuidv4(),
              name: `${doc.name} - ${new Date().toLocaleDateString('en-IN')}`,
              type: doc.type || 'draft',
              category: 'generated',
              content,
              caseId,
              createdAt: new Date().toISOString(),
            });

            completedDrafts.push({ name: doc.name, type: doc.type || 'draft', content, status: 'done' as const });
          } catch (err) {
            console.error(`Failed to draft ${doc.name}:`, err);
            completedDrafts.push({ name: doc.name, type: doc.type || 'draft', content: `Failed to generate: ${err}`, status: 'error' as const });
          }
        }
        setDrafts([...completedDrafts]);
      }

      setProgress(100);
      setProgressLabel('Complete');
      setStage('complete');
      toast.success('Case created with auto-generated documents');
    } catch (err: any) {
      console.error('Auto-create failed:', err);
      toast.error('Case created but some auto-generation failed');
      setStage('extracted');
    }
  };

  const handleAnalyze = async () => {
    await autoAnalyze();
  };

  const updateField = (key: keyof ExtractedCaseData, value: string) => {
    setExtractedData((prev) => ({ ...prev, [key]: value }));
  };

  const handleViewDraft = (draft: GeneratedDraft) => {
    setViewerTitle(draft.name);
    setViewerContent(draft.content);
    setViewerOpen(true);
  };

  const handleDownloadPDF = (draft: GeneratedDraft) => {
    const doc = generatePDF(draft.content, draft.name);
    downloadPDF(doc, `${draft.name.toLowerCase().replace(/ /g, '-')}.pdf`);
    toast.success('PDF downloaded');
  };

  const handleDownloadDOC = (draft: GeneratedDraft) => {
    // Escape HTML to prevent XSS from AI-generated content
    const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${escapeHtml(draft.name)}</title>
      <style>body{font-family:Times New Roman,serif;font-size:12pt;line-height:1.6;margin:1in;}h1{font-size:16pt;font-weight:bold;}h2{font-size:14pt;font-weight:bold;}</style></head>
      <body>${escapeHtml(draft.content).replace(/\n/g, '<br>')}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.name.toLowerCase().replace(/ /g, '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('DOC downloaded');
  };

  const resetIntake = () => {
    // Cancel any in-progress drafting
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setDescription('');
    setResult(null);
    setError('');
    setExtractedData({});
    setEditMode(false);
    setUploadedFiles([]);
    setExtractedTexts([]);
    setStage('idle');
    setProgress(0);
    setProgressLabel('');
    setCreatedCaseId(null);
    setCreatedClientId(null);
    setDrafts([]);
  };

  const goToCases = () => {
    setCurrentView('cases');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FilePlus className="h-6 w-6 text-primary" />
          AI Case Intake
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents or describe the case. AI handles everything autonomously — extraction, classification, case creation, and document drafting.
        </p>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        title={viewerTitle}
        content={viewerContent}
      />

      {/* Autonomous Progress Bar */}
      {stage !== 'idle' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Autonomous Flow</span>
              </div>
              <span className="text-xs text-muted-foreground">{progressLabel}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px]">
                <span className={stage !== 'idle' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                  {['idle', 'uploading'].includes(stage) ? 'Upload' : <CheckCircle2 className="h-3 w-3 inline" />} Upload
                </span>
                <span className={['analyzing', 'extracted', 'creating-case', 'drafting', 'complete'].includes(stage) ? 'text-primary font-medium' : 'text-muted-foreground'}>
                  {['analyzing', 'extracted', 'creating-case', 'drafting', 'complete'].includes(stage) ? <CheckCircle2 className="h-3 w-3 inline" /> : '○'} Analyze
                </span>
                <span className={['creating-case', 'drafting', 'complete'].includes(stage) ? 'text-primary font-medium' : 'text-muted-foreground'}>
                  {['creating-case', 'drafting', 'complete'].includes(stage) ? <CheckCircle2 className="h-3 w-3 inline" /> : '○'} Create Case
                </span>
                <span className={stage === 'complete' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                  {stage === 'complete' ? <CheckCircle2 className="h-3 w-3 inline" /> : '○'} Draft Docs
                </span>
              </div>
              <Badge variant={stage === 'complete' ? 'default' : 'outline'} className="text-[10px]">
                {Math.round(progress)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Card */}
      {stage === 'idle' && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Upload Documents
            </CardTitle>
            <CardDescription className="text-xs">
              Upload documents (PDF, DOCX, Images, Text). AI will extract everything and create the case automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 cursor-pointer p-8"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png,.txt"
                onChange={handleFilesUpload}
                multiple
                className="hidden"
              />
              {uploadingFile ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-sm font-medium">Extracting documents...</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Drop documents here or <span className="text-primary underline">browse</span></p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, Images, Text — Multiple files supported</p>
                </>
              )}
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    {file.status === 'done' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{file.size} • {file.status === 'done' ? 'Extracted' : 'Failed'}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Or describe the case</Label>
              <Textarea
                placeholder="e.g., My client Mrs. Sunita Sharma was illegally terminated from ABC Corp. She was employed for 12 years. We need to file before the Labour Court..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button onClick={handleAnalyze} disabled={loading} className="gap-2 w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Analyzing...' : 'Analyze & Auto-Create'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Analysis Failed</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && stage !== 'idle' && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <Tabs defaultValue={stage === 'complete' ? 'documents' : 'summary'}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
              <TabsTrigger value="classification">Classification</TabsTrigger>
              <TabsTrigger value="documents">
                Documents
                {drafts.length > 0 && <Badge className="ml-1.5 h-4 w-4 text-[10px] p-0 flex items-center justify-center">{drafts.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-3">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Case Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96">
                    <MarkdownContent content={generateSummary(extractedData)} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="extracted" className="mt-3">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Extracted Information</CardTitle>
                    <div className="flex items-center gap-2">
                      {createdCaseId && (
                        <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Case Created
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setEditMode(!editMode)}>
                        {editMode ? 'Done Editing' : 'Edit Fields'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {editMode ? (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Case Title</Label>
                          <Input value={extractedData.caseTitle || ''} onChange={(e) => updateField('caseTitle', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Case Type</Label>
                          <Input value={extractedData.caseType || ''} onChange={(e) => updateField('caseType', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Client Name</Label>
                          <Input value={extractedData.clientName || ''} onChange={(e) => updateField('clientName', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Opposing Party</Label>
                          <Input value={extractedData.opposingParty || ''} onChange={(e) => updateField('opposingParty', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Accused Name</Label>
                          <Input value={extractedData.accusedName || ''} onChange={(e) => updateField('accusedName', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Accused Phone</Label>
                          <Input value={extractedData.accusedPhone || ''} onChange={(e) => updateField('accusedPhone', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">FIR Number</Label>
                          <Input value={extractedData.firNumber || ''} onChange={(e) => updateField('firNumber', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Police Station</Label>
                          <Input value={extractedData.policeStation || ''} onChange={(e) => updateField('policeStation', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Court</Label>
                          <Input value={extractedData.courtName || ''} onChange={(e) => updateField('courtName', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Address</Label>
                          <Input value={extractedData.clientAddress || ''} onChange={(e) => updateField('clientAddress', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Phone</Label>
                          <Input value={extractedData.clientPhone || ''} onChange={(e) => updateField('clientPhone', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Email</Label>
                          <Input value={extractedData.clientEmail || ''} onChange={(e) => updateField('clientEmail', e.target.value)} />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Cause of Action</Label>
                          <Textarea value={extractedData.causeOfAction || ''} onChange={(e) => updateField('causeOfAction', e.target.value)} rows={3} className="resize-none" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Relief Sought</Label>
                          <Textarea value={extractedData.reliefSought || ''} onChange={(e) => updateField('reliefSought', e.target.value)} rows={3} className="resize-none" />
                        </div>
                      </>
                    ) : (
                      <>
                        <InfoField icon={Scale} label="Case Type" value={extractedData.caseType} />
                        <InfoField icon={Users} label="Client" value={extractedData.clientName} />
                        <InfoField icon={ShieldCheck} label="Opposing Party" value={extractedData.opposingParty} />
                        <InfoField icon={Users} label="Accused" value={extractedData.accusedName} />
                        <InfoField icon={Phone} label="Phone" value={extractedData.clientPhone || extractedData.accusedPhone} />
                        <InfoField icon={MapPin} label="Address" value={extractedData.clientAddress} />
                        <InfoField icon={FileText} label="FIR Number" value={extractedData.firNumber} />
                        <InfoField icon={ShieldCheck} label="Police Station" value={extractedData.policeStation} />
                        <InfoField icon={Scale} label="Court" value={extractedData.courtName} />
                        <InfoField icon={Phone} label="Email" value={extractedData.clientEmail} />
                      </>
                    )}
                  </div>

                  {!editMode && extractedData.sections && extractedData.sections.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Relevant Sections</p>
                      <div className="flex flex-wrap gap-1.5">
                        {extractedData.sections.map((s: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="classification" className="mt-3">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Case Classification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {extractedData.caseType && (
                      <Badge className="bg-primary/10 text-primary border border-primary/20">{extractedData.caseType}</Badge>
                    )}
                    {extractedData.subType && (
                      <Badge variant="outline">{extractedData.subType}</Badge>
                    )}
                    {extractedData.suggestedDocuments?.map((doc: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{typeof doc === 'string' ? doc : doc.name}</Badge>
                    ))}
                  </div>
                  {extractedData.nextSteps && extractedData.nextSteps.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">Suggested Next Steps</p>
                      <ul className="space-y-1">
                        {extractedData.nextSteps.map((step: any, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            {typeof step === 'string' ? step : step.action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-3">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Generated Documents
                    {stage === 'complete' && (
                      <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px]">All Done</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {drafts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      {stage === 'drafting' ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                          <p className="text-sm font-medium">AI is drafting documents...</p>
                          <p className="text-xs text-muted-foreground mt-1">{progressLabel}</p>
                        </>
                      ) : (
                        <>
                          <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">Documents will be generated after analysis</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {drafts.map((draft, idx) => (
                        <div key={idx} className={`rounded-lg border p-3 transition-all ${draft.status === 'done' ? 'bg-primary/5 border-primary/20' : draft.status === 'error' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {draft.status === 'done' ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              ) : draft.status === 'error' ? (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              ) : (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium">{draft.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {draft.status === 'done' && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDraft(draft)} title="View">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDraft(draft)} title="Edit">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPDF(draft)} title="PDF">
                                    <FileDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadDOC(draft)} title="DOC">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{draft.content.substring(0, 200)}...</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          {stage === 'complete' && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={goToCases} className="gap-2 flex-1">
                    <Briefcase className="h-4 w-4" /> View Case
                  </Button>
                  <Button variant="outline" className="gap-2 flex-1" onClick={resetIntake}>
                    <RotateCcw className="h-4 w-4" /> New Intake
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiCall, getAuthToken } from '@/lib/api-client';
import { Upload, FileText, FileType, Image, X, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

interface UploadResult {
  text: string;
  structuredData: any;
  fileName: string;
}

interface DocumentUploadProps {
  module?: 'civil' | 'criminal' | 'family' | 'execution';
  onExtracted?: (result: UploadResult) => void;
  compact?: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'text/plain',
];

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.jpg,.jpeg,.png,.webp,.tiff,.txt';

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-400" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileType className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-red-400" />;
}

export function DocumentUpload({ module = 'civil', onExtracted, compact = false }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'extracting' | 'done' | 'error'>('idle');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [structuredData, setStructuredData] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(file.name.substring(file.name.lastIndexOf('.')).toLowerCase())) {
      toast.error('Unsupported file type. Use PDF, DOCX, images, or text files.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    setUploading(true);
    setExtracting(false);
    setProgress(0);
    setStatus('uploading');
    setExtractedText('');
    setStructuredData(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setProgress(40);

        try {
          const token = getAuthToken();
          // Step 1: Extract text from file
          const extractRes = await apiCall('/ai-extract-file', {
            fileData: base64,
            mimeType: file.type,
            fileName: file.name,
          }, token || undefined);

          setProgress(70);
          const text = extractRes.text || extractRes.content || extractRes.responseText || '';
          setExtractedText(text);
          setExtracting(true);
          setUploading(false);

          // Step 2: Extract structured data
          let structured = null;
          try {
            const dataRes = await apiCall('/ai-extract-data', {
              text: text.substring(0, 8000),
              module,
            }, token || undefined);
            structured = dataRes.data || dataRes.extracted || dataRes;
          } catch (e) {
            console.warn('Data extraction failed, continuing with text only');
          }

          setStructuredData(structured);
          setProgress(100);
          setStatus('done');
          setExtracting(false);

          if (onExtracted) {
            onExtracted({
              text,
              structuredData: structured,
              fileName: file.name,
            });
          }

          toast.success('Document extracted successfully');
        } catch (err: any) {
          setStatus('error');
          toast.error(err?.message || 'Failed to extract document');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setStatus('error');
      toast.error('Failed to read file');
    }
  }, [module, onExtracted]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const reset = () => {
    setStatus('idle');
    setFileName('');
    setFileSize('');
    setExtractedText('');
    setStructuredData(null);
    setProgress(0);
  };

  if (compact && status === 'done') {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{fileName}</p>
          <p className="text-[10px] text-muted-foreground">{fileSize} • Extracted</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={reset}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : status === 'done'
            ? 'border-primary/30 bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        } ${compact ? 'p-6' : 'p-8'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
          className="hidden"
        />

        {status === 'idle' && (
          <>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3 ${compact ? 'h-10 w-10' : ''}`}>
              <Upload className={`text-primary ${compact ? 'h-5 w-5' : 'h-6 w-6'}`} />
            </div>
            <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
              Drop document here or <span className="text-primary underline">browse</span>
            </p>
            <p className={`text-muted-foreground mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              PDF, DOCX, Images, Text — Max 10MB
            </p>
          </>
        )}

        {(status === 'uploading' || status === 'extracting') && (
          <>
            <Loader2 className={`animate-spin text-primary mb-3 ${compact ? 'h-5 w-5' : 'h-6 w-6'}`} />
            <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
              {status === 'uploading' ? 'Reading document...' : 'Extracting data with AI...'}
            </p>
            <Progress value={progress} className="mt-3 h-1.5 w-48" />
          </>
        )}

        {status === 'done' && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-1">{fileSize} • Extracted successfully</p>
            <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); reset(); }}>
              <X className="h-3 w-3" /> Upload Different File
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 mb-3">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive">Extraction failed</p>
            <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); reset(); }}>
              Try Again
            </Button>
          </>
        )}
      </div>

      {/* Extracted Data Preview */}
      {structuredData && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Extracted Data</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(structuredData).filter(([_, v]) => v !== null && v !== undefined && v !== '').slice(0, 8).map(([key, value]) => (
                <div key={key} className="text-[10px]">
                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="ml-1 font-medium">{Array.isArray(value) ? value.join(', ') : String(value).substring(0, 50)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  householdId: string;
  folder: string;
  recordId?: string;
  onUpload: (urls: string[]) => void;
  existingFiles?: string[];
  maxFiles?: number;
  accept?: string;
  className?: string;
}

interface UploadedFile {
  url: string;
  name: string;
  type: string;
}

export function FileUploader({
  householdId,
  folder,
  recordId,
  onUpload,
  existingFiles = [],
  maxFiles = 5,
  accept = 'application/pdf,image/*',
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(
    existingFiles.map(url => ({
      url,
      name: url.split('/').pop() || 'dokument',
      type: url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      setError(`Maximálny počet súborov je ${maxFiles}`);
      return;
    }

    const filesToUpload = Array.from(selectedFiles).slice(0, remainingSlots);
    setIsUploading(true);
    setError(null);

    const newFiles: UploadedFile[] = [];

    for (const file of filesToUpload) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('householdId', householdId);
        formData.append('folder', folder);
        if (recordId) {
          formData.append('recordId', recordId);
        }

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data = await response.json();
        newFiles.push({
          url: data.data.url,
          name: file.name,
          type: file.type,
        });
      } catch (err) {
        console.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Nastala chyba pri nahrávaní');
      }
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onUpload(updatedFiles.map(f => f.url));
    }

    setIsUploading(false);
  }, [files, maxFiles, householdId, folder, recordId, onUpload]);

  const handleRemoveFile = useCallback(async (index: number) => {
    const fileToRemove = files[index];
    
    try {
      // Extract path from URL for deletion
      const url = new URL(fileToRemove.url);
      const path = url.pathname.split('/').slice(-4).join('/'); // Get last 4 parts of path

      await fetch('/api/files/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    } catch (err) {
      console.error('Delete error:', err);
      // Continue anyway - file might already be deleted
    }

    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onUpload(updatedFiles.map(f => f.url));
  }, [files, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          'hover:border-primary hover:bg-primary/5',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Nahrávam...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Kliknite alebo pretiahnite súbory</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG, PNG (max {maxFiles} súborov)
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-primary/10 rounded text-primary">
                  {getFileIcon(file.type)}
                </div>
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

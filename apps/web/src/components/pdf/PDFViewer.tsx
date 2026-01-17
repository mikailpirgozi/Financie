'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  fileName?: string;
}

export function PDFViewer({ url, fileName }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(url, '_blank');
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setScale(prev => Math.max(prev - 25, 50));

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-muted/20">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-lg font-semibold mb-2">PDF sa nepodarilo načítať</p>
        <p className="text-sm text-muted-foreground mb-6">
          Skúste súbor stiahnuť alebo otvoriť v novom okne
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleOpenInNewTab}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            Otvoriť v novom okne
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 rounded-lg text-green-600 dark:text-green-400 transition-colors font-medium"
          >
            <Download className="h-4 w-4" />
            Stiahnuť PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/50 border-b">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 50}
            className="p-2 rounded-lg bg-background border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zmenšiť"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {scale}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 200}
            className="p-2 rounded-lg bg-background border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zväčšiť"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenInNewTab}
            className="p-2 rounded-lg bg-background border hover:bg-accent transition-colors"
            title="Otvoriť v novom okne"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
            title="Stiahnuť"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Embed */}
      <div className="flex-1 overflow-auto bg-muted/30 relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Načítavam PDF...</p>
          </div>
        )}
        
        <iframe
          src={`${url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
          className="w-full h-full border-0"
          style={{ 
            transform: `scale(${scale / 100})`,
            transformOrigin: 'top left',
            width: `${10000 / scale}%`,
            height: `${10000 / scale}%`
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
          title={fileName || 'PDF Document'}
        />
      </div>
    </div>
  );
}

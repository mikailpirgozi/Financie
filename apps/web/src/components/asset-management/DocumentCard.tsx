'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import {
  FileCheck,
  Wind,
  Ticket,
  Calendar,
  Car,
  MoreVertical,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  Eye,
  Download,
} from 'lucide-react';
import {
  VehicleDocument,
  DOCUMENT_TYPE_LABELS,
  VIGNETTE_COUNTRY_LABELS,
  VIGNETTE_COUNTRY_FLAGS,
  getExpirationStatus,
  getDaysUntilExpiry,
} from '@finapp/core';

interface DocumentCardProps {
  vehicleDoc: VehicleDocument;
  onEdit: (doc: VehicleDocument) => void;
  onDelete: (id: string) => void;
  onExtend?: (doc: VehicleDocument) => void;
  onOpenFile?: (url: string) => void;
}

const getDocumentIcon = (type: string) => {
  switch (type) {
    case 'stk':
      return FileCheck;
    case 'ek':
      return Wind;
    case 'vignette':
      return Ticket;
    default:
      return FileCheck;
  }
};

export function DocumentCard({
  vehicleDoc,
  onEdit,
  onDelete,
  onExtend,
  onOpenFile,
}: DocumentCardProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);

  const status = getExpirationStatus(vehicleDoc.validTo);
  const daysUntil = getDaysUntilExpiry(vehicleDoc.validTo);
  const isExpired = status === 'expired';
  const isExpiring = status === 'expiring';

  const Icon = getDocumentIcon(vehicleDoc.documentType);

  const getStatusColor = () => {
    if (isExpired) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    if (isExpiring) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
  };

  const getStatusLabel = () => {
    if (isExpired) return 'Expirované';
    if (isExpiring) return `Expiruje o ${daysUntil} dní`;
    return 'Platné';
  };

  const handleDownloadFile = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${vehicleDoc.documentType}-${vehicleDoc.documentNumber || 'dokument'}.pdf`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  // Calculate validity progress
  const getValidityProgress = () => {
    const now = new Date();
    const from = vehicleDoc.validFrom ? new Date(vehicleDoc.validFrom) : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const to = new Date(vehicleDoc.validTo);
    
    const totalDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    const daysLeft = Math.max(0, Math.ceil((to.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const daysUsed = totalDays - daysLeft;
    const percentage = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100));
    
    return { percentage, daysLeft, totalDays };
  };

  const progress = getValidityProgress();
  
  const getProgressColor = () => {
    if (progress.daysLeft <= 0) return 'bg-red-500';
    if (progress.daysLeft <= 30) return 'bg-orange-500';
    if (progress.percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div
      className={`bg-card rounded-xl border ${
        isExpired ? 'border-red-500/30' : isExpiring ? 'border-orange-500/30' : 'border-border'
      } overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isExpired
                  ? 'bg-red-500/10'
                  : isExpiring
                  ? 'bg-orange-500/10'
                  : 'bg-primary/10'
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  isExpired
                    ? 'text-red-600 dark:text-red-400'
                    : isExpiring
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-primary'
                }`}
              />
            </div>
            <div>
              <div className="font-semibold">
                {DOCUMENT_TYPE_LABELS[vehicleDoc.documentType]}
              </div>
              {vehicleDoc.documentNumber && (
                <div className="text-sm text-muted-foreground">{vehicleDoc.documentNumber}</div>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 py-1 bg-popover border rounded-lg shadow-xl z-20">
                  {(isExpired || isExpiring) && onExtend && (
                    <button
                      onClick={() => {
                        onExtend(vehicleDoc);
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-primary/10 flex items-center gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Predĺžiť
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onEdit(vehicleDoc);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Upraviť
                  </button>
                  <button
                    onClick={() => {
                      onDelete(vehicleDoc.id);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Odstrániť
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}
          >
            {(isExpired || isExpiring) && <AlertTriangle className="h-3 w-3" />}
            {getStatusLabel()}
          </span>
          {vehicleDoc.documentType === 'vignette' && vehicleDoc.country && (
            <span className="text-sm">
              {VIGNETTE_COUNTRY_FLAGS[vehicleDoc.country]} {VIGNETTE_COUNTRY_LABELS[vehicleDoc.country]}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {vehicleDoc.asset && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-4 w-4" />
              <span>
                {vehicleDoc.asset.name}
                {vehicleDoc.asset.licensePlate && ` (${vehicleDoc.asset.licensePlate})`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {vehicleDoc.validFrom && `${new Date(vehicleDoc.validFrom).toLocaleDateString('sk-SK')} - `}
              {new Date(vehicleDoc.validTo).toLocaleDateString('sk-SK')}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="pt-2">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressColor()} rounded-full transition-all`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {progress.daysLeft > 0 ? `${progress.daysLeft} dní` : 'Expirované'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div>
            {vehicleDoc.price ? (
              <>
                <div className="text-lg font-bold">
                  {Number(vehicleDoc.price).toLocaleString('sk-SK')}€
                </div>
                {vehicleDoc.kmState && (
                  <div className="text-xs text-muted-foreground">
                    {vehicleDoc.kmState.toLocaleString('sk-SK')} km
                  </div>
                )}
              </>
            ) : vehicleDoc.kmState ? (
              <div className="text-sm text-muted-foreground">
                {vehicleDoc.kmState.toLocaleString('sk-SK')} km
              </div>
            ) : null}
          </div>

          {vehicleDoc.filePaths && vehicleDoc.filePaths.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFile?.(vehicleDoc.filePaths![0]);
                }}
                className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded text-primary transition-colors"
                title="Otvoriť súbor"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => handleDownloadFile(vehicleDoc.filePaths![0], e)}
                className="p-1.5 bg-green-500/10 hover:bg-green-500/20 rounded text-green-600 dark:text-green-400 transition-colors"
                title="Stiahnuť súbor"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {vehicleDoc.filePaths.length > 1 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{vehicleDoc.filePaths.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

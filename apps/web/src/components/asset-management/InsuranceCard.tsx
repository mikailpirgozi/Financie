'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import {
  Shield,
  Calendar,
  Building2,
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
  Insurance,
  INSURANCE_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  getExpirationStatus,
  getDaysUntilExpiry,
} from '@finapp/core';

interface InsuranceCardProps {
  insurance: Insurance;
  onEdit: (insurance: Insurance) => void;
  onDelete: (id: string) => void;
  onExtend?: (insurance: Insurance) => void;
  onOpenFile?: (url: string) => void;
}

export function InsuranceCard({
  insurance,
  onEdit,
  onDelete,
  onExtend,
  onOpenFile,
}: InsuranceCardProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);

  const status = getExpirationStatus(insurance.validTo);
  const daysUntil = getDaysUntilExpiry(insurance.validTo);
  const isExpired = status === 'expired';
  const isExpiring = status === 'expiring';

  const getStatusColor = () => {
    if (isExpired) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    if (isExpiring) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
  };

  const getStatusLabel = () => {
    if (isExpired) return 'Expirovaná';
    if (isExpiring) return `Expiruje o ${daysUntil} dní`;
    return 'Aktívna';
  };

  const handleDownloadFile = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = `poistka-${insurance.policyNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <Shield
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
                {INSURANCE_TYPE_LABELS[insurance.type] || insurance.type}
              </div>
              <div className="text-sm text-muted-foreground">{insurance.policyNumber}</div>
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
                        onExtend(insurance);
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
                      onEdit(insurance);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Upraviť
                  </button>
                  <button
                    onClick={() => {
                      onDelete(insurance.id);
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
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {insurance.company && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{insurance.company}</span>
            </div>
          )}

          {insurance.asset && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-4 w-4" />
              <span>
                {insurance.asset.name}
                {insurance.asset.licensePlate && ` (${insurance.asset.licensePlate})`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(insurance.validFrom).toLocaleDateString('sk-SK')} -{' '}
              {new Date(insurance.validTo).toLocaleDateString('sk-SK')}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div>
            <div className="text-lg font-bold">
              {Number(insurance.price).toLocaleString('sk-SK')}€
            </div>
            <div className="text-xs text-muted-foreground">
              {PAYMENT_FREQUENCY_LABELS[insurance.paymentFrequency]}
            </div>
          </div>

          {insurance.filePaths && insurance.filePaths.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFile?.(insurance.filePaths![0]);
                }}
                className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded text-primary transition-colors"
                title="Otvoriť súbor"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => handleDownloadFile(insurance.filePaths![0], e)}
                className="p-1.5 bg-green-500/10 hover:bg-green-500/20 rounded text-green-600 dark:text-green-400 transition-colors"
                title="Stiahnuť súbor"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {insurance.filePaths.length > 1 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{insurance.filePaths.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

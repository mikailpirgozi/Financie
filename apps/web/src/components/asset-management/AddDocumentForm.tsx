'use client';

import { useState, useEffect } from 'react';
import { X, Shield, FileCheck, Wind, Ticket, Clipboard, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@finapp/ui';
import { FileUploader } from './FileUploader';
import type { InsuranceType, PaymentFrequency, ServiceType, VignetteCountry } from '@finapp/core';
import {
  INSURANCE_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  VIGNETTE_COUNTRY_LABELS,
  SERVICE_TYPE_LABELS,
} from '@finapp/core';

type FormType = 'insurance' | 'stk' | 'ek' | 'vignette' | 'service' | 'fine';

interface Asset {
  id: string;
  kind: string;
  name: string;
  license_plate?: string;
}

interface EditData {
  id: string;
  assetId?: string | null;
  insuranceType?: InsuranceType;
  policyNumber?: string;
  company?: string | null;
  price?: number;
  paymentFrequency?: PaymentFrequency;
  validFrom?: string;
  validTo?: string;
  filePaths?: string[];
  notes?: string | null;
  // Document fields
  documentNumber?: string | null;
  country?: VignetteCountry;
  kmState?: number | null;
  // Service fields
  serviceDate?: string;
  serviceProvider?: string | null;
  serviceType?: ServiceType;
  description?: string | null;
  // Fine fields
  fineDate?: string;
  fineAmount?: number;
  isPaid?: boolean;
}

interface AddDocumentFormProps {
  isOpen: boolean;
  onClose: () => void;
  formType: FormType;
  householdId: string;
  assets: Asset[];
  onSuccess: () => void;
  editData?: EditData | null;
}

const formConfig: Record<FormType, { title: string; editTitle: string; icon: React.ElementType }> = {
  insurance: { title: 'Nová poistka', editTitle: 'Upraviť poistku', icon: Shield },
  stk: { title: 'Nové STK', editTitle: 'Upraviť STK', icon: FileCheck },
  ek: { title: 'Nová emisná kontrola', editTitle: 'Upraviť EK', icon: Wind },
  vignette: { title: 'Nová dialničná známka', editTitle: 'Upraviť známku', icon: Ticket },
  service: { title: 'Nový servisný záznam', editTitle: 'Upraviť servis', icon: Clipboard },
  fine: { title: 'Nová pokuta', editTitle: 'Upraviť pokutu', icon: AlertCircle },
};

export function AddDocumentForm({
  isOpen,
  onClose,
  formType,
  householdId,
  assets,
  onSuccess,
  editData,
}: AddDocumentFormProps) {
  const isEditMode = !!editData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePaths, setFilePaths] = useState<string[]>(editData?.filePaths || []);

  // Insurance fields
  const [insuranceType, setInsuranceType] = useState<InsuranceType>(editData?.insuranceType || 'pzp');
  const [policyNumber, setPolicyNumber] = useState(editData?.policyNumber || '');
  const [company, setCompany] = useState(editData?.company || '');
  const [price, setPrice] = useState(editData?.price?.toString() || '');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>(editData?.paymentFrequency || 'yearly');
  const [validFrom, setValidFrom] = useState(editData?.validFrom || new Date().toISOString().split('T')[0]);
  const [validTo, setValidTo] = useState(editData?.validTo || '');
  const [assetId, setAssetId] = useState(editData?.assetId || '');

  // Document fields
  const [documentNumber, setDocumentNumber] = useState(editData?.documentNumber || '');
  const [country, setCountry] = useState<VignetteCountry>(editData?.country || 'SK');
  const [kmState, setKmState] = useState(editData?.kmState?.toString() || '');

  // Service fields
  const [serviceDate, setServiceDate] = useState(editData?.serviceDate || new Date().toISOString().split('T')[0]);
  const [serviceProvider, setServiceProvider] = useState(editData?.serviceProvider || '');
  const [serviceType, setServiceType] = useState<ServiceType>(editData?.serviceType || 'regular');
  const [description, setDescription] = useState(editData?.description || '');

  // Fine fields
  const [fineDate, setFineDate] = useState(editData?.fineDate || new Date().toISOString().split('T')[0]);
  const [fineAmount, setFineAmount] = useState(editData?.fineAmount?.toString() || '');
  const [isPaid, setIsPaid] = useState(editData?.isPaid || false);

  const [notes, setNotes] = useState(editData?.notes || '');

  // Update form when editData changes (for edit mode)
  useEffect(() => {
    if (editData) {
      setInsuranceType(editData.insuranceType || 'pzp');
      setPolicyNumber(editData.policyNumber || '');
      setCompany(editData.company || '');
      setPrice(editData.price?.toString() || '');
      setPaymentFrequency(editData.paymentFrequency || 'yearly');
      setValidFrom(editData.validFrom || new Date().toISOString().split('T')[0]);
      setValidTo(editData.validTo || '');
      setAssetId(editData.assetId || '');
      setDocumentNumber(editData.documentNumber || '');
      setCountry(editData.country || 'SK');
      setKmState(editData.kmState?.toString() || '');
      setServiceDate(editData.serviceDate || new Date().toISOString().split('T')[0]);
      setServiceProvider(editData.serviceProvider || '');
      setServiceType(editData.serviceType || 'regular');
      setDescription(editData.description || '');
      setFineDate(editData.fineDate || new Date().toISOString().split('T')[0]);
      setFineAmount(editData.fineAmount?.toString() || '');
      setIsPaid(editData.isPaid || false);
      setNotes(editData.notes || '');
      setFilePaths(editData.filePaths || []);
    }
  }, [editData]);

  const config = formConfig[formType];
  const Icon = config.icon;

  const vehicleAssets = assets.filter(a => a.kind === 'vehicle');

  const resetForm = () => {
    setPolicyNumber('');
    setCompany('');
    setPrice('');
    setValidFrom(new Date().toISOString().split('T')[0]);
    setValidTo('');
    setAssetId('');
    setDocumentNumber('');
    setKmState('');
    setServiceDate(new Date().toISOString().split('T')[0]);
    setServiceProvider('');
    setDescription('');
    setFineDate(new Date().toISOString().split('T')[0]);
    setFineAmount('');
    setIsPaid(false);
    setNotes('');
    setFilePaths([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let endpoint = '';
      let body: Record<string, unknown> = isEditMode ? {} : { householdId };

      if (formType === 'insurance') {
        endpoint = isEditMode ? `/api/insurances/${editData?.id}` : '/api/insurances';
        body = {
          ...body,
          type: insuranceType,
          policyNumber,
          company: company || null,
          price: parseFloat(price),
          paymentFrequency,
          validFrom,
          validTo,
          assetId: assetId || null,
          filePaths,
          notes: notes || null,
        };
      } else if (['stk', 'ek', 'vignette'].includes(formType)) {
        endpoint = isEditMode ? `/api/vehicle-documents/${editData?.id}` : '/api/vehicle-documents';
        body = {
          ...body,
          documentType: formType,
          assetId,
          validFrom: validFrom || null,
          validTo,
          documentNumber: documentNumber || null,
          price: price ? parseFloat(price) : null,
          country: formType === 'vignette' ? country : null,
          kmState: kmState ? parseInt(kmState) : null,
          filePaths,
          notes: notes || null,
        };
      } else if (formType === 'service') {
        endpoint = isEditMode ? `/api/service-records/${editData?.id}` : '/api/service-records';
        body = {
          ...body,
          assetId,
          serviceDate,
          serviceProvider: serviceProvider || null,
          serviceType,
          price: price ? parseFloat(price) : null,
          kmState: kmState ? parseInt(kmState) : null,
          description: description || null,
          filePaths,
          notes: notes || null,
        };
      } else if (formType === 'fine') {
        endpoint = isEditMode ? `/api/fines/${editData?.id}` : '/api/fines';
        body = {
          ...body,
          assetId: assetId || null,
          fineDate,
          fineAmount: parseFloat(fineAmount),
          isPaid,
          description: description || null,
          filePaths,
          notes: notes || null,
        };
      }

      const response = await fetch(endpoint, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nastala chyba pri ukladaní');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nastala neočakávaná chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-background shadow-2xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{isEditMode ? config.editTitle : config.title}</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Insurance Fields */}
          {formType === 'insurance' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Typ poistky <span className="text-destructive">*</span>
                </label>
                <select
                  value={insuranceType}
                  onChange={(e) => setInsuranceType(e.target.value as InsuranceType)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {Object.entries(INSURANCE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Číslo poistky <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="Napr. 123456789"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Poisťovňa</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Napr. Allianz"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Cena <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Frekvencia platby</label>
                  <select
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* STK/EK/Vignette Fields */}
          {['stk', 'ek', 'vignette'].includes(formType) && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Vozidlo <span className="text-destructive">*</span>
                </label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Vyberte vozidlo</option>
                  {vehicleAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.license_plate && `(${a.license_plate})`}
                    </option>
                  ))}
                </select>
              </div>

              {formType === 'vignette' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Krajina</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value as VignetteCountry)}
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(VIGNETTE_COUNTRY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Číslo dokladu</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Nepovinné"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Cena (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {['stk', 'ek'].includes(formType) && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Stav km</label>
                  <input
                    type="number"
                    value={kmState}
                    onChange={(e) => setKmState(e.target.value)}
                    placeholder="Napr. 125000"
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </>
          )}

          {/* Service Fields */}
          {formType === 'service' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Vozidlo <span className="text-destructive">*</span>
                </label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Vyberte vozidlo</option>
                  {vehicleAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.license_plate && `(${a.license_plate})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Dátum servisu <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Typ servisu</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Servis</label>
                <input
                  type="text"
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  placeholder="Napr. Autoservis XY"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Cena (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Stav km</label>
                  <input
                    type="number"
                    value={kmState}
                    onChange={(e) => setKmState(e.target.value)}
                    placeholder="125000"
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Popis</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Čo bolo vykonané..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </>
          )}

          {/* Fine Fields */}
          {formType === 'fine' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Vozidlo</label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Žiadne (všeobecná pokuta)</option>
                  {vehicleAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.license_plate && `(${a.license_plate})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Dátum pokuty <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={fineDate}
                  onChange={(e) => setFineDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Suma (€) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Popis</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dôvod pokuty..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isPaid" className="text-sm font-medium">
                  Pokuta je zaplatená
                </label>
              </div>
            </>
          )}

          {/* Common Fields - Dates */}
          {['insurance', 'stk', 'ek', 'vignette'].includes(formType) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Platné od {formType === 'insurance' && <span className="text-destructive">*</span>}
                </label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required={formType === 'insurance'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Platné do <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
          )}

          {/* Vehicle selection for insurance */}
          {formType === 'insurance' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Vozidlo (voliteľné)</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Žiadne</option>
                {vehicleAssets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.license_plate && `(${a.license_plate})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Poznámky</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Voliteľné poznámky..."
              rows={2}
              className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Prílohy</label>
            <FileUploader
              householdId={householdId}
              folder={formType === 'insurance' ? 'insurances' : formType === 'service' ? 'service' : formType === 'fine' ? 'fines' : 'documents'}
              onUpload={setFilePaths}
              existingFiles={filePaths}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Zrušiť
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ukladám...
              </>
            ) : (
              'Uložiť'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

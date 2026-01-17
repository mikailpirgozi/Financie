'use client';

import type { JSX } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Plus,
  Search,
  RefreshCw,
  FileCheck,
  Wind,
  Ticket,
  Clipboard,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@finapp/ui';
import { InsuranceCard, DocumentCard, StatsCards, AddDocumentForm } from '@/components/asset-management';
import { PDFViewer } from '@/components/pdf/PDFViewer';
import type {
  Insurance,
  VehicleDocument,
  ServiceRecord,
  Fine,
  InsuranceStats,
  DocumentStats,
  InsuranceType,
  VignetteCountry,
  ServiceType,
} from '@finapp/core';

type FormType = 'insurance' | 'stk' | 'ek' | 'vignette' | 'service' | 'fine';

interface Asset {
  id: string;
  kind: string;
  name: string;
  license_plate?: string;
}

interface DocumentsClientProps {
  householdId: string;
  assets: Asset[];
}

type TabType = 'insurances' | 'stk' | 'ek' | 'vignettes' | 'service' | 'fines';

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'insurances', label: 'Poistky', icon: Shield },
  { id: 'stk', label: 'STK', icon: FileCheck },
  { id: 'ek', label: 'Emisná kontrola', icon: Wind },
  { id: 'vignettes', label: 'Dialničné známky', icon: Ticket },
  { id: 'service', label: 'Servisná knižka', icon: Clipboard },
  { id: 'fines', label: 'Pokuty', icon: AlertCircle },
];

export function DocumentsClient({ householdId, assets }: DocumentsClientProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('insurances');
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Stats
  const [insuranceStats, setInsuranceStats] = useState<InsuranceStats | null>(null);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);

  // Preview panel
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // Add form
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<FormType>('insurance');
  const [editData, setEditData] = useState<Insurance | VehicleDocument | ServiceRecord | Fine | null>(null);

  const openAddForm = (type: FormType) => {
    setEditData(null);
    setFormType(type);
    setFormOpen(true);
  };

  const openEditForm = (type: FormType, data: Insurance | VehicleDocument | ServiceRecord | Fine) => {
    setEditData(data);
    setFormType(type);
    setFormOpen(true);
  };

  const getFormTypeForTab = (): FormType => {
    switch (activeTab) {
      case 'insurances': return 'insurance';
      case 'stk': return 'stk';
      case 'ek': return 'ek';
      case 'vignettes': return 'vignette';
      case 'service': return 'service';
      case 'fines': return 'fine';
      default: return 'insurance';
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [insurancesRes, documentsRes, serviceRes, finesRes] = await Promise.all([
        fetch(`/api/insurances?householdId=${householdId}`),
        fetch(`/api/vehicle-documents?householdId=${householdId}`),
        fetch(`/api/service-records?householdId=${householdId}`),
        fetch(`/api/fines?householdId=${householdId}`),
      ]);

      if (insurancesRes.ok) {
        const data = await insurancesRes.json();
        setInsurances(data.data || []);
        setInsuranceStats(data.stats);
      }

      if (documentsRes.ok) {
        const data = await documentsRes.json();
        setDocuments(data.data || []);
        setDocumentStats(data.stats);
      }

      if (serviceRes.ok) {
        const data = await serviceRes.json();
        setServiceRecords(data.data || []);
      }

      if (finesRes.ok) {
        const data = await finesRes.json();
        setFines(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter functions
  const filteredInsurances = useMemo(() => {
    return insurances.filter(ins => {
      if (assetFilter && ins.assetId !== assetFilter) return false;
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const assetName = ins.asset?.name?.toLowerCase() || '';
        const licensePlate = ins.asset?.licensePlate?.toLowerCase() || '';
        if (
          !ins.policyNumber.toLowerCase().includes(search) &&
          !(ins.company || '').toLowerCase().includes(search) &&
          !assetName.includes(search) &&
          !licensePlate.includes(search)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all') {
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const validTo = new Date(ins.validTo);
        if (statusFilter === 'active' && validTo <= thirtyDays) return false;
        if (statusFilter === 'expiring' && (validTo < now || validTo > thirtyDays)) return false;
        if (statusFilter === 'expired' && validTo >= now) return false;
      }
      return true;
    });
  }, [insurances, assetFilter, searchQuery, statusFilter]);

  const filteredDocuments = useMemo(() => {
    const docType = activeTab === 'stk' ? 'stk' : activeTab === 'ek' ? 'ek' : 'vignette';
    return documents.filter(doc => {
      if (doc.documentType !== docType) return false;
      if (assetFilter && doc.assetId !== assetFilter) return false;
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const assetName = doc.asset?.name?.toLowerCase() || '';
        const licensePlate = doc.asset?.licensePlate?.toLowerCase() || '';
        if (
          !(doc.documentNumber || '').toLowerCase().includes(search) &&
          !assetName.includes(search) &&
          !licensePlate.includes(search)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all') {
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const validTo = new Date(doc.validTo);
        if (statusFilter === 'valid' && validTo <= thirtyDays) return false;
        if (statusFilter === 'expiring' && (validTo < now || validTo > thirtyDays)) return false;
        if (statusFilter === 'expired' && validTo >= now) return false;
      }
      return true;
    });
  }, [documents, activeTab, assetFilter, searchQuery, statusFilter]);

  // CRUD handlers
  const handleDeleteInsurance = async (id: string) => {
    if (!confirm('Naozaj chcete odstrániť túto poistku?')) return;
    try {
      const res = await fetch(`/api/insurances/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInsurances(prev => prev.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Naozaj chcete odstrániť tento dokument?')) return;
    try {
      const res = await fetch(`/api/vehicle-documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleOpenFile = (url: string) => {
    const isPDF = url.toLowerCase().includes('.pdf');
    const fileName = url.split('/').pop() || 'document';
    
    if (isPDF) {
      setPreviewFile({ url, name: fileName });
    } else {
      window.open(url, '_blank');
    }
  };

  // Calculate tab stats
  const getTabStats = (tabId: TabType) => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (tabId === 'insurances') {
      return {
        expiring: insurances.filter(i => {
          const validTo = new Date(i.validTo);
          return validTo >= now && validTo <= thirtyDays;
        }).length,
        expired: insurances.filter(i => new Date(i.validTo) < now).length,
      };
    }

    if (tabId === 'service') {
      return { expiring: 0, expired: 0 };
    }

    if (tabId === 'fines') {
      return {
        expiring: 0,
        expired: fines.filter(f => !f.isPaid).length,
      };
    }

    const docType = tabId === 'stk' ? 'stk' : tabId === 'ek' ? 'ek' : 'vignette';
    const docs = documents.filter(d => d.documentType === docType);
    return {
      expiring: docs.filter(d => {
        const validTo = new Date(d.validTo);
        return validTo >= now && validTo <= thirtyDays;
      }).length,
      expired: docs.filter(d => new Date(d.validTo) < now).length,
    };
  };

  // Clear filters
  const hasActiveFilters = searchQuery || assetFilter || statusFilter !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setAssetFilter('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Dokumenty</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Správa poistiek, STK, emisných kontrol a dialničných známok
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Obnoviť
          </Button>
          <Button onClick={() => openAddForm(getFormTypeForTab())}>
            <Plus className="h-4 w-4 mr-2" />
            Nový záznam
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const stats = getTabStats(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {stats.expiring > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400">
                  {stats.expiring}
                </span>
              )}
              {stats.expired > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500/20 text-red-600 dark:text-red-400">
                  {stats.expired}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      {activeTab === 'insurances' && insuranceStats && (
        <StatsCards stats={insuranceStats} />
      )}
      {['stk', 'ek', 'vignettes'].includes(activeTab) && documentStats && (
        <StatsCards 
          stats={documentStats} 
          type="document" 
          label={tabs.find(t => t.id === activeTab)?.label || ''} 
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hľadať podľa čísla, vozidla..."
                className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="px-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
            >
              <option value="">Všetky vozidlá</option>
              {assets
                .filter(a => a.kind === 'vehicle')
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.license_plate && `(${a.license_plate})`}
                  </option>
                ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Všetky stavy</option>
              <option value={activeTab === 'insurances' ? 'active' : 'valid'}>
                {activeTab === 'insurances' ? 'Aktívne' : 'Platné'}
              </option>
              <option value="expiring">Expirujúce</option>
              <option value="expired">Expirované</option>
            </select>

            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Zrušiť
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
              <span>Načítavam...</span>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'insurances' ? (
        filteredInsurances.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {hasActiveFilters ? 'Žiadne poistky nezodpovedajú filtrom' : 'Zatiaľ nemáte žiadne poistky'}
              </h3>
              <Button className="mt-4" onClick={() => openAddForm('insurance')}>
                <Plus className="h-4 w-4 mr-2" />
                Pridať poistku
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredInsurances.map(insurance => (
              <InsuranceCard
                key={insurance.id}
                insurance={insurance}
                onEdit={(ins) => openEditForm('insurance', ins)}
                onDelete={handleDeleteInsurance}
                onExtend={() => {/* TODO: open extend form */}}
                onOpenFile={handleOpenFile}
              />
            ))}
          </div>
        )
      ) : activeTab === 'service' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {serviceRecords.length === 0 
                ? 'Zatiaľ nemáte žiadne servisné záznamy' 
                : `${serviceRecords.length} servisných záznamov`}
            </h3>
            <Button className="mt-4" onClick={() => openAddForm('service')}>
              <Plus className="h-4 w-4 mr-2" />
              Pridať servisný záznam
            </Button>
          </CardContent>
        </Card>
      ) : activeTab === 'fines' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {fines.length === 0 
                ? 'Zatiaľ nemáte žiadne pokuty' 
                : `${fines.length} pokút (${fines.filter(f => !f.isPaid).length} nezaplatených)`}
            </h3>
            <Button className="mt-4" onClick={() => openAddForm('fine')}>
              <Plus className="h-4 w-4 mr-2" />
              Pridať pokutu
            </Button>
          </CardContent>
        </Card>
      ) : (
        filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              {activeTab === 'stk' && <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
              {activeTab === 'ek' && <Wind className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
              {activeTab === 'vignettes' && <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
              <h3 className="text-lg font-medium mb-2">
                {hasActiveFilters 
                  ? 'Žiadne záznamy nezodpovedajú filtrom' 
                  : `Zatiaľ nemáte žiadne ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}`}
              </h3>
              <Button className="mt-4" onClick={() => openAddForm(getFormTypeForTab())}>
                <Plus className="h-4 w-4 mr-2" />
                Pridať {activeTab === 'stk' ? 'STK' : activeTab === 'ek' ? 'EK' : 'známku'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map(doc => (
              <DocumentCard
                key={doc.id}
                vehicleDoc={doc}
                onEdit={(d) => openEditForm(d.documentType as FormType, d)}
                onDelete={handleDeleteDocument}
                onExtend={() => {/* TODO: open extend form */}}
                onOpenFile={handleOpenFile}
              />
            ))}
          </div>
        )
      )}

      {/* File Preview Panel */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setPreviewFile(null)}
          />
          <div className="w-full md:w-3/4 lg:w-2/3 xl:w-1/2 bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Náhľad súboru</h2>
                  <p className="text-sm text-muted-foreground">{previewFile.name}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PDFViewer url={previewFile.url} fileName={previewFile.name} />
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Document Form */}
      <AddDocumentForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditData(null);
        }}
        formType={formType}
        householdId={householdId}
        assets={assets}
        onSuccess={fetchData}
        editData={editData ? {
          id: editData.id,
          assetId: 'assetId' in editData ? editData.assetId : undefined,
          insuranceType: 'type' in editData ? editData.type as InsuranceType : undefined,
          policyNumber: 'policyNumber' in editData ? editData.policyNumber : undefined,
          company: 'company' in editData ? editData.company : undefined,
          price: 'price' in editData ? Number(editData.price) : undefined,
          paymentFrequency: 'paymentFrequency' in editData ? editData.paymentFrequency : undefined,
          validFrom: 'validFrom' in editData ? editData.validFrom : undefined,
          validTo: 'validTo' in editData ? editData.validTo : undefined,
          filePaths: 'filePaths' in editData ? editData.filePaths : undefined,
          notes: 'notes' in editData ? editData.notes : undefined,
          documentNumber: 'documentNumber' in editData ? editData.documentNumber : undefined,
          country: 'country' in editData ? editData.country as VignetteCountry : undefined,
          kmState: 'kmState' in editData ? editData.kmState : undefined,
          serviceDate: 'serviceDate' in editData ? editData.serviceDate : undefined,
          serviceProvider: 'serviceProvider' in editData ? editData.serviceProvider : undefined,
          serviceType: 'serviceType' in editData ? editData.serviceType as ServiceType : undefined,
          description: 'description' in editData ? editData.description : undefined,
          fineDate: 'fineDate' in editData ? editData.fineDate : undefined,
          fineAmount: 'fineAmount' in editData ? Number(editData.fineAmount) : undefined,
          isPaid: 'isPaid' in editData ? editData.isPaid : undefined,
        } : null}
      />
    </div>
  );
}

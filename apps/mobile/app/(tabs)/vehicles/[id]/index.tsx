import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { useVehicle } from '@/hooks';
import {
  deleteVehicle,
  createVehicleDocument,
  updateVehicleDocument,
  deleteVehicleDocument,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  createServiceRecord,
  updateServiceRecord,
  deleteServiceRecord,
  createFine,
  updateFine,
  deleteFine,
  getCurrentHousehold,
  getSignedUrl,
} from '@/lib/api';
import { ErrorMessage } from '@/components/ErrorMessage';
import { DocumentListItem } from '@/components/common';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import {
  VehicleDetailTabs,
  type VehicleDetailTab,
  type VehicleDetailTabConfig,
} from '@/components/vehicles';
import {
  AddDocumentModal,
  type DocumentCategory,
  type EditData,
  type EditInsuranceData,
  type EditVehicleDocumentData,
  type EditServiceRecordData,
  type EditFineData,
  type InsuranceFormData,
  type VehicleDocumentFormData,
  type ServiceRecordFormData,
  type FineFormData,
} from '@/components/documents';
import {
  formatInsuranceType,
  formatDocumentType,
  formatServiceType,
  formatVignetteCountry,
  type InsuranceType,
  type ServiceType,
  type VignetteCountry,
} from '@finapp/core';

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('sk-SK');
}

const FUEL_TYPE_LABELS: Record<string, string> = {
  petrol: 'Benzín',
  diesel: 'Diesel',
  electric: 'Elektro',
  hybrid: 'Hybrid',
  lpg: 'LPG',
  cng: 'CNG',
};

const TRANSMISSION_LABELS: Record<string, string> = {
  manual: 'Manuálna',
  automatic: 'Automatická',
};

const FILE_CATEGORY_LABELS: Record<string, string> = {
  stk: 'STK',
  ek: 'Emisná kontrola',
  vignette: 'Diaľničná známka',
  technical_certificate: 'Technický preukaz',
  insurance: 'Poistka',
  service: 'Servis',
  fine: 'Pokuta',
  loan: 'Úver',
};

type ExpiryStatus = 'ok' | 'expiring' | 'expired' | 'missing';

/**
 * Konzistentné s `VehicleCard` – ak je k dispozícii boolean flag z DB view
 * (vehicle_tco_summary.*_expired / *_expiring_soon), používame ho.
 * Inak fallback na porovnanie dátumov (potrebné pre raw insurance/document položky).
 */
function classifyExpiry(
  date: string | null | undefined,
  flags?: { expired?: boolean | null; expiringSoon?: boolean | null }
): ExpiryStatus {
  if (flags?.expired) return 'expired';
  if (!date) return flags?.expiringSoon ? 'expiring' : 'missing';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(date);
  if (expiry < today) return 'expired';
  if (flags?.expiringSoon) return 'expiring';
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  if (expiry <= thirtyDaysFromNow) return 'expiring';
  return 'ok';
}

export default function VehicleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [refreshing, setRefreshing] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<VehicleDetailTab>('overview');

  // Document viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<string[]>([]);
  const [viewerTitle, setViewerTitle] = useState('Dokument');

  // Add/edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDocumentType, setModalDocumentType] = useState<DocumentCategory>('insurance');
  const [modalEditData, setModalEditData] = useState<EditData | undefined>(undefined);

  const { vehicle, isLoading, error, refetch } = useVehicle(id || null);

  React.useEffect(() => {
    getCurrentHousehold()
      .then((h) => setHouseholdId(h.id))
      .catch(console.error);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (id) refetch();
    }, [id, refetch])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/vehicles/${id}/edit`);
  };

  const handleDelete = () => {
    Alert.alert('Zmazať vozidlo', `Naozaj chcete zmazať "${vehicle?.name}"?`, [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVehicle(id!);
            router.replace('/(tabs)/vehicles');
          } catch {
            Alert.alert('Chyba', 'Nepodarilo sa zmazať vozidlo');
          }
        },
      },
    ]);
  };

  const handleViewDocument = async (filePath: string, title?: string) => {
    if (!filePath || filePath.trim() === '') {
      Alert.alert('Info', 'Dokument nemá priradený súbor');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const signedUrl = await getSignedUrl(filePath);
      setViewerFiles([signedUrl]);
      setViewerTitle(title || 'Dokument');
      setViewerVisible(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Neznáma chyba';
      Alert.alert('Chyba', `Nepodarilo sa načítať dokument: ${errorMessage}`);
    }
  };

  const openAddModal = (category: DocumentCategory) => {
    setModalDocumentType(category);
    setModalEditData(undefined);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openEditModal = (category: DocumentCategory, editData: EditData) => {
    setModalDocumentType(category);
    setModalEditData(editData);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveDocument = useCallback(
    async (
      formData: InsuranceFormData | VehicleDocumentFormData | ServiceRecordFormData | FineFormData,
      editId?: string
    ) => {
      if (!householdId) {
        throw new Error('Household not loaded');
      }

      switch (formData.type) {
        case 'insurance': {
          const payload = {
            type: formData.insuranceType,
            policyNumber: formData.policyNumber,
            company: formData.company || undefined,
            insurerId: formData.insurerId || undefined,
            assetId: formData.assetId || id,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            price: formData.price,
            paymentFrequency: formData.paymentFrequency,
            notes: formData.notes,
            filePaths: formData.filePaths,
          };
          if (editId) {
            await updateInsurance(editId, payload);
          } else {
            await createInsurance({ ...payload, householdId });
          }
          break;
        }

        case 'vehicleDocument': {
          const payload = {
            documentType: formData.documentType,
            assetId: formData.assetId || id!,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            documentNumber: formData.documentNumber,
            price: formData.price,
            country: formData.country,
            notes: formData.notes,
            filePaths: formData.filePaths,
          };
          if (editId) {
            await updateVehicleDocument(editId, payload);
          } else {
            await createVehicleDocument({ ...payload, householdId });
          }
          break;
        }

        case 'serviceRecord': {
          const payload = {
            assetId: formData.assetId || id!,
            serviceDate: formData.serviceDate,
            serviceType: formData.serviceType,
            serviceProvider: formData.serviceProvider,
            kmState: formData.kmState,
            price: formData.price,
            description: formData.description,
            notes: formData.notes,
            filePaths: formData.filePaths,
          };
          if (editId) {
            await updateServiceRecord(editId, payload);
          } else {
            await createServiceRecord({ ...payload, householdId });
          }
          break;
        }

        case 'fine': {
          const payload = {
            assetId: formData.assetId || id,
            fineDate: formData.fineDate,
            fineAmount: formData.fineAmount,
            fineAmountLate: formData.fineAmountLate,
            country: formData.country,
            enforcementCompany: formData.enforcementCompany,
            isPaid: formData.isPaid,
            description: formData.description,
            filePaths: formData.filePaths,
          };
          if (editId) {
            await updateFine(editId, payload);
          } else {
            await createFine({ ...payload, householdId });
          }
          break;
        }
      }

      await refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [householdId, id, refetch]
  );

  const handleDeleteItem = useCallback(
    (kind: 'insurance' | 'vehicleDocument' | 'service' | 'fine', itemId: string, label: string) => {
      Alert.alert('Zmazať', `Naozaj chcete zmazať ${label}?`, [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              if (kind === 'insurance') await deleteInsurance(itemId);
              else if (kind === 'vehicleDocument') await deleteVehicleDocument(itemId);
              else if (kind === 'service') await deleteServiceRecord(itemId);
              else if (kind === 'fine') await deleteFine(itemId);
              await refetch();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Chyba', 'Nepodarilo sa zmazať položku');
            }
          },
        },
      ]);
    },
    [refetch]
  );

  // Loading / error states
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/vehicles')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Vozidlo</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !vehicle) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/vehicles')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Vozidlo</Text>
          <View style={{ width: 40 }} />
        </View>
        <ErrorMessage message={error || 'Vozidlo nenájdené'} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const linkedItems = ('linkedItems' in vehicle ? vehicle.linkedItems : null) || {
    loans: [],
    insurances: [],
    documents: [],
    serviceRecords: [],
    fines: [],
  };

  const insurances = linkedItems.insurances ?? [];
  const documents = linkedItems.documents ?? [];
  const serviceRecords = linkedItems.serviceRecords ?? [];
  const fines = linkedItems.fines ?? [];
  const loans = linkedItems.loans ?? [];
  const allFiles =
    (
      linkedItems as {
        allFiles?: Array<{
          id: string;
          source: string;
          name: string;
          filePath: string;
          category: string;
          date?: string;
        }>;
      }
    ).allFiles ?? [];

  const stkDocs = documents.filter((d) => d.documentType === 'stk');
  const ekDocs = documents.filter((d) => d.documentType === 'ek');
  const vignetteDocs = documents.filter((d) => d.documentType === 'vignette');
  const tpDocs = documents.filter((d) => d.documentType === 'technical_certificate');

  const vehicleTitle =
    vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : vehicle.name;
  const equity = vehicle.currentValue - vehicle.totalLoanBalance;

  const tabs: VehicleDetailTabConfig[] = [
    { id: 'overview', label: 'Prehľad', icon: 'speedometer-outline' },
    {
      id: 'insurances',
      label: 'Poistky',
      icon: 'shield-checkmark-outline',
      badge: insurances.length,
      alert: vehicle.insuranceExpired || vehicle.insuranceExpiringSoon,
    },
    {
      id: 'documents',
      label: 'Dokumenty',
      icon: 'document-text-outline',
      badge: documents.length,
      alert:
        vehicle.stkExpired ||
        vehicle.ekExpired ||
        vehicle.vignetteExpired ||
        vehicle.stkExpiringSoon ||
        vehicle.ekExpiringSoon ||
        vehicle.vignetteExpiringSoon,
    },
    { id: 'service', label: 'Servis', icon: 'construct-outline', badge: serviceRecords.length },
    {
      id: 'fines',
      label: 'Pokuty',
      icon: 'warning-outline',
      badge: fines.length,
      alert: vehicle.unpaidFineCount > 0,
    },
    { id: 'loans', label: 'Úvery', icon: 'wallet-outline', badge: loans.length },
    { id: 'files', label: 'Súbory', icon: 'folder-open-outline', badge: allFiles.length },
  ];

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="car" size={32} color={colors.primary} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{vehicleTitle}</Text>
            {vehicle.licensePlate && (
              <Text
                style={[
                  styles.licensePlate,
                  { color: colors.text, backgroundColor: colors.border },
                ]}
              >
                {vehicle.licensePlate}
              </Text>
            )}
            {vehicle.registeredCompany && (
              <View style={styles.companyRow}>
                <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.companyText, { color: colors.textSecondary }]}>
                  {vehicle.registeredCompany}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Hodnota" value={formatCurrency(vehicle.currentValue)} colors={colors} />
        <StatCard
          label="Úver"
          value={formatCurrency(vehicle.totalLoanBalance)}
          subValue={
            vehicle.activeLoanCount != null && vehicle.historicalLoanCount != null
              ? `${vehicle.activeLoanCount} aktív. / ${vehicle.historicalLoanCount} hist.`
              : undefined
          }
          colors={colors}
        />
        <StatCard
          label="Equity"
          value={formatCurrency(equity)}
          valueColor={equity >= 0 ? colors.success : colors.error}
          colors={colors}
        />
        <StatCard
          label="TCO"
          value={formatCurrency(vehicle.totalCostOfOwnership)}
          colors={colors}
        />
      </View>

      {/* Status row for STK / EK / vignette / poistky */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Aktuálny stav</Text>
        <View style={styles.statusGrid}>
          <StatusChip
            label="STK"
            status={classifyExpiry(vehicle.latestStkExpiry ?? vehicle.stkExpiry ?? null, {
              expired: vehicle.stkExpired,
              expiringSoon: vehicle.stkExpiringSoon,
            })}
            date={vehicle.latestStkExpiry ?? vehicle.stkExpiry}
            colors={colors}
            onPress={() => setActiveTab('documents')}
          />
          <StatusChip
            label="EK"
            status={classifyExpiry(vehicle.latestEkExpiry ?? vehicle.ekExpiry ?? null, {
              expired: vehicle.ekExpired,
              expiringSoon: vehicle.ekExpiringSoon,
            })}
            date={vehicle.latestEkExpiry ?? vehicle.ekExpiry}
            colors={colors}
            onPress={() => setActiveTab('documents')}
          />
          <StatusChip
            label="Diaľničná známka"
            status={classifyExpiry(vehicle.latestVignetteExpiry ?? vehicle.vignetteExpiry ?? null, {
              expired: vehicle.vignetteExpired,
              expiringSoon: vehicle.vignetteExpiringSoon,
            })}
            date={vehicle.latestVignetteExpiry ?? vehicle.vignetteExpiry}
            colors={colors}
            onPress={() => setActiveTab('documents')}
          />
          <StatusChip
            label="Poistka"
            status={classifyExpiry(
              vehicle.nearestInsuranceExpiry ?? vehicle.latestInsuranceExpiry ?? null,
              {
                expired: vehicle.insuranceExpired,
                expiringSoon: vehicle.insuranceExpiringSoon,
              }
            )}
            date={vehicle.nearestInsuranceExpiry ?? vehicle.latestInsuranceExpiry}
            colors={colors}
            onPress={() => setActiveTab('insurances')}
          />
        </View>
      </View>

      {/* Technical info */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Technické údaje</Text>
        <View>
          {vehicle.year && (
            <InfoRow label="Rok výroby" value={vehicle.year.toString()} colors={colors} />
          )}
          {vehicle.fuelType && (
            <InfoRow
              label="Palivo"
              value={FUEL_TYPE_LABELS[vehicle.fuelType] || vehicle.fuelType}
              colors={colors}
            />
          )}
          {vehicle.transmission && (
            <InfoRow
              label="Prevodovka"
              value={TRANSMISSION_LABELS[vehicle.transmission] || vehicle.transmission}
              colors={colors}
            />
          )}
          {vehicle.enginePower && (
            <InfoRow label="Výkon" value={`${vehicle.enginePower} kW`} colors={colors} />
          )}
          {vehicle.mileage && (
            <InfoRow
              label="Najazdené"
              value={`${vehicle.mileage.toLocaleString('sk-SK')} km`}
              colors={colors}
            />
          )}
          {vehicle.vin && <InfoRow label="VIN" value={vehicle.vin} colors={colors} />}
        </View>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.error + '10' }]}
        onPress={handleDelete}
      >
        <Ionicons name="trash-outline" size={20} color={colors.error} />
        <Text style={[styles.deleteButtonText, { color: colors.error }]}>Zmazať vozidlo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInsurances = () => (
    <View style={styles.tabContent}>
      {insurances.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="Žiadne poistky"
          description="Pridajte PZP, Kasko alebo iný typ poistenia."
          colors={colors}
        />
      ) : (
        <View style={styles.list}>
          {insurances.map((ins) => {
            const status = classifyExpiry(ins.validTo);
            return (
              <ItemCard
                key={ins.id}
                title={formatInsuranceType(ins.type)}
                subtitle={ins.company || ins.brokerCompany || ins.policyNumber}
                badge={statusBadge(status, colors)}
                meta={[
                  {
                    label: 'Platnosť',
                    value: `${formatDate(ins.validFrom)} - ${formatDate(ins.validTo)}`,
                  },
                  { label: 'Cena', value: formatCurrency(ins.price) },
                  ins.policyNumber ? { label: 'Číslo zmluvy', value: ins.policyNumber } : null,
                ]}
                files={ins.filePaths || []}
                onView={(p) => handleViewDocument(p, formatInsuranceType(ins.type))}
                onEdit={() =>
                  openEditModal('insurance', {
                    id: ins.id,
                    insuranceType: ins.type as InsuranceType,
                    policyNumber: ins.policyNumber,
                    company: ins.company,
                    assetId: id,
                    validFrom: ins.validFrom || ins.validTo,
                    validTo: ins.validTo,
                    price: ins.price,
                    paymentFrequency:
                      (ins.paymentFrequency as 'monthly' | 'quarterly' | 'biannual' | 'yearly') ||
                      'yearly',
                    notes: ins.notes,
                    filePaths: ins.filePaths,
                  } satisfies EditInsuranceData)
                }
                onDelete={() =>
                  handleDeleteItem('insurance', ins.id, formatInsuranceType(ins.type))
                }
                colors={colors}
              />
            );
          })}
        </View>
      )}
    </View>
  );

  const renderDocuments = () => (
    <View style={styles.tabContent}>
      {documents.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Žiadne dokumenty"
          description="Pridajte STK, EK, diaľničnú známku alebo TP."
          colors={colors}
        />
      ) : (
        <>
          <DocumentSection
            title="STK"
            docs={stkDocs}
            colors={colors}
            onView={handleViewDocument}
            onEdit={(doc) =>
              openEditModal('stk', {
                id: doc.id,
                documentType: 'stk',
                assetId: id,
                validFrom: doc.validFrom || undefined,
                validTo: doc.validTo,
                documentNumber: doc.documentNumber || undefined,
                price: doc.price,
                country: undefined,
                notes: doc.notes,
                filePaths: doc.filePaths,
              } satisfies EditVehicleDocumentData)
            }
            onDelete={(doc) => handleDeleteItem('vehicleDocument', doc.id, 'STK záznam')}
          />
          <DocumentSection
            title="Emisná kontrola (EK)"
            docs={ekDocs}
            colors={colors}
            onView={handleViewDocument}
            onEdit={(doc) =>
              openEditModal('ek', {
                id: doc.id,
                documentType: 'ek',
                assetId: id,
                validFrom: doc.validFrom || undefined,
                validTo: doc.validTo,
                documentNumber: doc.documentNumber || undefined,
                price: doc.price,
                notes: doc.notes,
                filePaths: doc.filePaths,
              } satisfies EditVehicleDocumentData)
            }
            onDelete={(doc) => handleDeleteItem('vehicleDocument', doc.id, 'EK záznam')}
          />
          <DocumentSection
            title="Diaľničné známky"
            docs={vignetteDocs}
            colors={colors}
            onView={handleViewDocument}
            onEdit={(doc) =>
              openEditModal('vignette', {
                id: doc.id,
                documentType: 'vignette',
                assetId: id,
                validFrom: doc.validFrom || undefined,
                validTo: doc.validTo,
                documentNumber: doc.documentNumber || undefined,
                price: doc.price,
                country: (doc.country as VignetteCountry) || undefined,
                notes: doc.notes,
                filePaths: doc.filePaths,
              } satisfies EditVehicleDocumentData)
            }
            onDelete={(doc) => handleDeleteItem('vehicleDocument', doc.id, 'diaľničnú známku')}
            extraInfo={(doc) =>
              doc.country ? `Krajina: ${formatVignetteCountry(doc.country)}` : null
            }
          />
          {tpDocs.length > 0 && (
            <DocumentSection
              title="Technické preukazy"
              docs={tpDocs}
              colors={colors}
              onView={handleViewDocument}
              onEdit={null}
              onDelete={(doc) => handleDeleteItem('vehicleDocument', doc.id, 'technický preukaz')}
            />
          )}
        </>
      )}
    </View>
  );

  const renderService = () => (
    <View style={styles.tabContent}>
      {serviceRecords.length === 0 ? (
        <EmptyState
          icon="construct-outline"
          title="Žiadne servisy"
          description="Pridajte záznam o servise alebo oprave."
          colors={colors}
        />
      ) : (
        <View style={styles.list}>
          {serviceRecords.map((rec) => (
            <ItemCard
              key={rec.id}
              title={rec.description || formatServiceType(rec.serviceType)}
              subtitle={rec.serviceProvider || formatServiceType(rec.serviceType)}
              meta={[
                { label: 'Dátum', value: formatDate(rec.serviceDate) },
                rec.kmState != null
                  ? { label: 'KM stav', value: `${rec.kmState.toLocaleString('sk-SK')} km` }
                  : null,
                rec.price != null ? { label: 'Cena', value: formatCurrency(rec.price) } : null,
              ]}
              files={rec.filePaths || []}
              onView={(p) => handleViewDocument(p, rec.description || 'Servis')}
              onEdit={() =>
                openEditModal('service', {
                  id: rec.id,
                  assetId: id,
                  serviceDate: rec.serviceDate,
                  serviceType: (rec.serviceType as ServiceType) || 'regular',
                  serviceProvider: rec.serviceProvider || undefined,
                  kmState: rec.kmState,
                  price: rec.price,
                  description: rec.description,
                  notes: rec.notes,
                  filePaths: rec.filePaths,
                } satisfies EditServiceRecordData)
              }
              onDelete={() => handleDeleteItem('service', rec.id, 'servisný záznam')}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );

  const renderFines = () => (
    <View style={styles.tabContent}>
      {fines.length === 0 ? (
        <EmptyState
          icon="warning-outline"
          title="Žiadne pokuty"
          description="Zaznamenajte si pokuty súvisiace s vozidlom."
          colors={colors}
        />
      ) : (
        <View style={styles.list}>
          {fines.map((fine) => (
            <ItemCard
              key={fine.id}
              title={fine.description || `Pokuta ${formatDate(fine.fineDate)}`}
              subtitle={fine.enforcementCompany || fine.country || undefined}
              badge={
                fine.isPaid
                  ? { label: 'Uhradená', color: colors.success }
                  : { label: 'Neuhradená', color: colors.error }
              }
              meta={[
                { label: 'Dátum', value: formatDate(fine.fineDate) },
                { label: 'Suma', value: formatCurrency(fine.fineAmount) },
              ]}
              files={fine.filePaths || []}
              onView={(p) => handleViewDocument(p, fine.description || 'Pokuta')}
              onEdit={() =>
                openEditModal('fine', {
                  id: fine.id,
                  assetId: id,
                  fineDate: fine.fineDate,
                  fineAmount: fine.fineAmount,
                  country: fine.country || undefined,
                  enforcementCompany: fine.enforcementCompany || undefined,
                  isPaid: fine.isPaid,
                  description: fine.description,
                  filePaths: fine.filePaths,
                } satisfies EditFineData)
              }
              onDelete={() => handleDeleteItem('fine', fine.id, 'pokutu')}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );

  const renderLoans = () => (
    <View style={styles.tabContent}>
      {loans.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="Žiadne úvery"
          description="Toto vozidlo zatiaľ nie je naviazané na žiadny úver."
          colors={colors}
        />
      ) : (
        <View style={styles.list}>
          {loans.map((loan) => (
            <TouchableOpacity
              key={loan.id}
              style={[styles.itemCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/(tabs)/loans/${loan.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.itemCardHeader}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  {loan.name || loan.lender}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                {loan.lender}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Zostatok:</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {formatCurrency(loan.currentBalance)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                  Mesačná splátka:
                </Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {formatCurrency(loan.monthlyPayment)}
                </Text>
              </View>
              {loan.annualRate != null && (
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Úrok:</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {Number(loan.annualRate).toFixed(2)}%
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderFiles = () => (
    <View style={styles.tabContent}>
      {allFiles.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          title="Žiadne súbory"
          description="Súbory pripojené k vozidlu sa zobrazia tu."
          colors={colors}
        />
      ) : (
        <View style={styles.documentsList}>
          {allFiles.map((file) => (
            <DocumentListItem
              key={file.id}
              id={file.id}
              name={file.name}
              documentType={file.category}
              documentTypeLabel={FILE_CATEGORY_LABELS[file.category] || file.category}
              filePath={file.filePath}
              secondaryDate={file.date}
              secondaryDateLabel="Dátum"
              showType
              onView={(p) => handleViewDocument(p, file.name)}
            />
          ))}
        </View>
      )}
    </View>
  );

  const fabCategoryByTab: Record<VehicleDetailTab, DocumentCategory | null> = {
    overview: null,
    insurances: 'insurance',
    documents: 'stk',
    service: 'service',
    fines: 'fine',
    loans: null,
    files: null,
  };

  const fabCategory = fabCategoryByTab[activeTab];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/vehicles')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {vehicleTitle}
        </Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <VehicleDetailTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'insurances' && renderInsurances()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'service' && renderService()}
        {activeTab === 'fines' && renderFines()}
        {activeTab === 'loans' && renderLoans()}
        {activeTab === 'files' && renderFiles()}
      </ScrollView>

      {/* FAB to add new item, depending on tab */}
      {fabCategory && (
        <FloatingActionButton
          onPress={() => {
            if (activeTab === 'documents') {
              // For documents tab show selection bottom sheet (default to STK for now)
              Alert.alert('Pridať dokument', 'Vyberte typ dokumentu', [
                { text: 'STK', onPress: () => openAddModal('stk') },
                { text: 'Emisná kontrola', onPress: () => openAddModal('ek') },
                { text: 'Diaľničná známka', onPress: () => openAddModal('vignette') },
                { text: 'Zrušiť', style: 'cancel' },
              ]);
            } else {
              openAddModal(fabCategory);
            }
          }}
          icon={<Plus size={24} color="#fff" />}
        />
      )}

      <AddDocumentModal
        visible={modalVisible}
        documentType={modalDocumentType}
        householdId={householdId || undefined}
        editData={modalEditData}
        presetAssetId={id}
        onSave={handleSaveDocument}
        onClose={() => {
          setModalVisible(false);
          setModalEditData(undefined);
        }}
      />

      <DocumentViewer
        visible={viewerVisible}
        files={viewerFiles}
        onClose={() => setViewerVisible(false)}
        title={viewerTitle}
      />
    </SafeAreaView>
  );
}

// ============================================
// Helper components
// ============================================

interface ColorsType {
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  card: string;
  background: string;
  surface: string;
  surfacePressed: string;
  primary: string;
  primaryLight: string;
  success: string;
  warning: string;
  error: string;
}

function StatCard({
  label,
  value,
  subValue,
  valueColor,
  colors,
}: {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
  colors: ColorsType;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.statValue, { color: valueColor || colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      {subValue && (
        <Text style={[styles.statSubValue, { color: colors.textMuted }]}>{subValue}</Text>
      )}
    </View>
  );
}

function statusColor(status: ExpiryStatus, colors: ColorsType): string {
  if (status === 'expired') return colors.error;
  if (status === 'expiring') return colors.warning;
  if (status === 'ok') return colors.success;
  return colors.textMuted;
}

function statusLabel(status: ExpiryStatus): string {
  if (status === 'expired') return 'Po platnosti';
  if (status === 'expiring') return 'Končí čoskoro';
  if (status === 'ok') return 'Aktuálne';
  return 'Chýba';
}

function StatusChip({
  label,
  status,
  date,
  colors,
  onPress,
}: {
  label: string;
  status: ExpiryStatus;
  date?: string | null;
  colors: ColorsType;
  onPress?: () => void;
}) {
  const color = statusColor(status, colors);
  return (
    <TouchableOpacity
      style={[styles.statusChip, { backgroundColor: color + '15' }]}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statusChipHeader}>
        <Text style={[styles.statusChipLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.statusChipStatus, { color }]}>{statusLabel(status)}</Text>
      {date && status !== 'missing' && (
        <Text style={[styles.statusChipDate, { color: colors.textMuted }]}>{formatDate(date)}</Text>
      )}
    </TouchableOpacity>
  );
}

function statusBadge(
  status: ExpiryStatus,
  colors: ColorsType
): { label: string; color: string } | undefined {
  if (status === 'missing') return undefined;
  return { label: statusLabel(status), color: statusColor(status, colors) };
}

interface ItemCardMeta {
  label: string;
  value: string;
}

function ItemCard({
  title,
  subtitle,
  badge,
  meta,
  files,
  onView,
  onEdit,
  onDelete,
  colors,
}: {
  title: string;
  subtitle?: string;
  badge?: { label: string; color: string };
  meta: (ItemCardMeta | null | undefined | false)[];
  files?: string[];
  onView?: (path: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  colors: ColorsType;
}) {
  return (
    <View style={[styles.itemCard, { backgroundColor: colors.card }]}>
      <View style={styles.itemCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
        {badge && (
          <View style={[styles.itemBadge, { backgroundColor: badge.color + '20' }]}>
            <Text style={[styles.itemBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        )}
      </View>
      <View style={styles.itemMetaList}>
        {meta
          .filter((m): m is ItemCardMeta => Boolean(m))
          .map((m, idx) => (
            <View key={idx} style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{m.label}:</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>{m.value}</Text>
            </View>
          ))}
      </View>
      {files && files.length > 0 && onView && (
        <View style={styles.fileChips}>
          {files.map((file, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.fileChip, { backgroundColor: colors.surfacePressed }]}
              onPress={() => onView(file)}
            >
              <Ionicons name="document-attach-outline" size={14} color={colors.primary} />
              <Text style={[styles.fileChipText, { color: colors.primary }]} numberOfLines={1}>
                {`Súbor ${idx + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.itemActions}>
        {onEdit && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfacePressed }]}
            onPress={onEdit}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Upraviť</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Zmazať</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

interface DocumentSectionProps {
  title: string;
  docs: Array<{
    id: string;
    documentType: string;
    documentNumber?: string | null;
    validFrom?: string | null;
    validTo: string;
    price?: number;
    country?: string | null;
    notes?: string;
    filePaths?: string[];
  }>;
  colors: ColorsType;
  onView: (path: string, title?: string) => void;
  onEdit: ((doc: DocumentSectionProps['docs'][number]) => void) | null;
  onDelete: (doc: DocumentSectionProps['docs'][number]) => void;
  extraInfo?: (doc: DocumentSectionProps['docs'][number]) => string | null;
}

function DocumentSection({
  title,
  docs,
  colors,
  onView,
  onEdit,
  onDelete,
  extraInfo,
}: DocumentSectionProps) {
  if (docs.length === 0) return null;
  return (
    <View style={styles.documentSection}>
      <Text style={[styles.documentSectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.list}>
        {docs.map((doc) => {
          const status = classifyExpiry(doc.validTo);
          const extra = extraInfo?.(doc);
          return (
            <ItemCard
              key={doc.id}
              title={doc.documentNumber || formatDocumentType(doc.documentType)}
              subtitle={extra || undefined}
              badge={statusBadge(status, colors)}
              meta={[
                doc.validFrom ? { label: 'Platí od', value: formatDate(doc.validFrom) } : null,
                { label: 'Platí do', value: formatDate(doc.validTo) },
                doc.price != null ? { label: 'Cena', value: formatCurrency(doc.price) } : null,
              ]}
              files={doc.filePaths || []}
              onView={(p) => onView(p, formatDocumentType(doc.documentType))}
              onEdit={onEdit ? () => onEdit(doc) : undefined}
              onDelete={() => onDelete(doc)}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string; border: string };
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: ColorsType;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backButton: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  editButton: { padding: 8 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  tabContent: {
    padding: 16,
  },
  // Overview hero
  heroCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  licensePlate: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyText: {
    fontSize: 13,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statSubValue: {
    fontSize: 10,
    marginTop: 2,
  },
  // Sections
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  // Status grid
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 10,
  },
  statusChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipStatus: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusChipDate: {
    fontSize: 11,
    marginTop: 2,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Delete button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // List / item cards
  list: {
    gap: 12,
  },
  itemCard: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemMetaList: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  fileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 140,
  },
  fileChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  documentSection: {
    marginBottom: 16,
  },
  documentSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  documentsList: {
    gap: 0,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
});

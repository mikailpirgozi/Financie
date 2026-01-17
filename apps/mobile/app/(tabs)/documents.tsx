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
import { Ionicons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAllDocuments } from '@/hooks';
import {
  InsuranceCard,
  DocumentCard,
  AddDocumentModal,
  DocumentActionSheet,
  DocumentViewer,
  ExtendValidityModal,
  type DocumentCategory,
  type InsuranceFormData,
  type VehicleDocumentFormData,
  type ServiceRecordFormData,
  type FineFormData,
  type EditInsuranceData,
  type EditVehicleDocumentData,
  type EditData,
} from '@/components/documents';
import { FloatingActionButton } from '@/components/ui';
import { getCurrentHousehold, updateInsurance, updateVehicleDocument, getSignedUrl } from '@/lib/api';
import type { Insurance, VehicleDocument } from '@finapp/core';
import { INSURANCE_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from '@finapp/core';

type TabType = 'insurances' | 'stk' | 'ek' | 'vignettes' | 'service' | 'fines';

const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'insurances', label: 'Poistky', icon: 'shield-checkmark' },
  { id: 'stk', label: 'STK', icon: 'document-text' },
  { id: 'ek', label: 'EK', icon: 'cloud-outline' },
  { id: 'vignettes', label: 'Známky', icon: 'ticket-outline' },
  { id: 'service', label: 'Servis', icon: 'construct-outline' },
  { id: 'fines', label: 'Pokuty', icon: 'warning-outline' },
];

export default function DocumentsScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('insurances');
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDocumentType, setAddDocumentType] = useState<DocumentCategory>('insurance');
  
  // Edit state
  const [editData, setEditData] = useState<EditData | undefined>(undefined);
  
  // Action sheet state
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  
  // Document viewer state
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<string[]>([]);
  const [viewerTitle, setViewerTitle] = useState('Dokumenty');
  
  // Extend validity modal state
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDocType, setExtendDocType] = useState<'insurance' | 'stk' | 'ek' | 'vignette'>('insurance');
  const [extendCurrentValidTo, setExtendCurrentValidTo] = useState('');
  const [extendPaymentFrequency, setExtendPaymentFrequency] = useState<'monthly' | 'quarterly' | 'biannual' | 'yearly'>('yearly');
  const [extendItemId, setExtendItemId] = useState<string | null>(null);

  // Load household on mount
  React.useEffect(() => {
    getCurrentHousehold().then(h => setHouseholdId(h.id)).catch(console.error);
  }, []);

  const data = useAllDocuments(householdId);

  // Map tab type to document category
  const getDocumentCategory = (tab: TabType): DocumentCategory => {
    switch (tab) {
      case 'insurances': return 'insurance';
      case 'stk': return 'stk';
      case 'ek': return 'ek';
      case 'vignettes': return 'vignette';
      case 'service': return 'service';
      case 'fines': return 'fine';
      default: return 'insurance';
    }
  };

  // Open add modal for current tab
  const handleOpenAddModal = useCallback(() => {
    setAddDocumentType(getDocumentCategory(activeTab));
    setShowAddModal(true);
  }, [activeTab]);

  // Handle save from modal (create or update)
  const handleSaveDocument = useCallback(async (
    formData: InsuranceFormData | VehicleDocumentFormData | ServiceRecordFormData | FineFormData,
    editId?: string
  ) => {
    if (!householdId) {
      throw new Error('Household not loaded');
    }

    switch (formData.type) {
      case 'insurance':
        if (editId) {
          await updateInsurance(editId, {
            type: formData.insuranceType,
            policyNumber: formData.policyNumber,
            company: formData.company || undefined,
            insurerId: formData.insurerId || undefined,
            assetId: formData.assetId || undefined,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            price: formData.price,
            paymentFrequency: formData.paymentFrequency,
            notes: formData.notes,
            filePaths: formData.filePaths,
          });
          await data.insurances.refetch();
        } else {
          await data.insurances.create({
            type: formData.insuranceType,
            policyNumber: formData.policyNumber,
            company: formData.company || undefined,
            insurerId: formData.insurerId,
            assetId: formData.assetId,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            price: formData.price,
            paymentFrequency: formData.paymentFrequency,
            notes: formData.notes,
            filePaths: formData.filePaths,
          });
        }
        break;

      case 'vehicleDocument':
        if (formData.documentType === 'stk') {
          await data.stk.create({
            documentType: 'stk',
            assetId: formData.assetId,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            documentNumber: formData.documentNumber,
            price: formData.price,
            notes: formData.notes,
          });
        } else if (formData.documentType === 'ek') {
          await data.ek.create({
            documentType: 'ek',
            assetId: formData.assetId,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            documentNumber: formData.documentNumber,
            price: formData.price,
            notes: formData.notes,
          });
        } else if (formData.documentType === 'vignette') {
          await data.vignettes.create({
            documentType: 'vignette',
            assetId: formData.assetId,
            validFrom: formData.validFrom,
            validTo: formData.validTo,
            documentNumber: formData.documentNumber,
            price: formData.price,
            country: formData.country,
            notes: formData.notes,
          });
        }
        break;

      case 'serviceRecord':
        await data.service.create({
          assetId: formData.assetId,
          serviceDate: formData.serviceDate,
          serviceType: formData.serviceType,
          serviceProvider: formData.serviceProvider,
          kmState: formData.kmState,
          price: formData.price,
          description: formData.description,
          notes: formData.notes,
        });
        break;

      case 'fine':
        await data.fines.create({
          assetId: formData.assetId,
          fineDate: formData.fineDate,
          fineAmount: formData.fineAmount,
          fineAmountLate: formData.fineAmountLate,
          enforcementCompany: formData.enforcementCompany,
          isPaid: formData.isPaid,
          description: formData.description,
        });
        break;
    }
  }, [householdId, data]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    await data.refetchAll();
  }, [data.refetchAll]);

  // Get expiration counts for tab badges
  const getTabBadge = (tabId: TabType) => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let items: { validTo?: string }[] = [];

    switch (tabId) {
      case 'insurances':
        items = data.insurances.insurances;
        break;
      case 'stk':
        items = data.stk.documents;
        break;
      case 'ek':
        items = data.ek.documents;
        break;
      case 'vignettes':
        items = data.vignettes.documents;
        break;
      case 'fines':
        return data.fines.fines.filter(f => !f.isPaid).length;
      default:
        return 0;
    }

    return items.filter(item => {
      if (!item.validTo) return false;
      const validTo = new Date(item.validTo);
      return validTo < thirtyDays;
    }).length;
  };

  // Handle item press - show action sheet
  const handleInsurancePress = (insurance: Insurance) => {
    setSelectedInsurance(insurance);
    setSelectedDocument(null);
    setShowActionSheet(true);
  };

  const handleDocumentPress = (doc: VehicleDocument) => {
    setSelectedDocument(doc);
    setSelectedInsurance(null);
    setShowActionSheet(true);
  };

  // Close action sheet
  const handleCloseActionSheet = () => {
    setShowActionSheet(false);
    setSelectedInsurance(null);
    setSelectedDocument(null);
  };

  // Handle edit from action sheet
  const handleEdit = () => {
    if (selectedInsurance) {
      const ed: EditInsuranceData = {
        id: selectedInsurance.id,
        insuranceType: selectedInsurance.type,
        policyNumber: selectedInsurance.policyNumber,
        company: selectedInsurance.company,
        insurerId: selectedInsurance.insurerId,
        assetId: selectedInsurance.assetId,
        validFrom: selectedInsurance.validFrom,
        validTo: selectedInsurance.validTo,
        price: Number(selectedInsurance.price),
        paymentFrequency: selectedInsurance.paymentFrequency,
        notes: selectedInsurance.notes,
        filePaths: selectedInsurance.filePaths,
      };
      setEditData(ed);
      setAddDocumentType('insurance');
      setShowAddModal(true);
    } else if (selectedDocument) {
      const docType = selectedDocument.documentType;
      const ed: EditVehicleDocumentData = {
        id: selectedDocument.id,
        documentType: selectedDocument.documentType,
        validFrom: selectedDocument.validFrom,
        validTo: selectedDocument.validTo,
        documentNumber: selectedDocument.documentNumber,
        price: selectedDocument.price ? Number(selectedDocument.price) : undefined,
        country: selectedDocument.country,
        notes: selectedDocument.notes,
        filePaths: selectedDocument.filePaths,
      };
      setEditData(ed);
      setAddDocumentType(docType === 'stk' ? 'stk' : docType === 'ek' ? 'ek' : 'vignette');
      setShowAddModal(true);
    }
  };

  // Handle extend validity from action sheet
  const handleExtendValidity = () => {
    if (selectedInsurance) {
      setExtendDocType('insurance');
      setExtendCurrentValidTo(selectedInsurance.validTo);
      setExtendPaymentFrequency(selectedInsurance.paymentFrequency);
      setExtendItemId(selectedInsurance.id);
      setShowExtendModal(true);
    } else if (selectedDocument) {
      const docType = selectedDocument.documentType;
      setExtendDocType(docType === 'stk' ? 'stk' : docType === 'ek' ? 'ek' : 'vignette');
      setExtendCurrentValidTo(selectedDocument.validTo);
      setExtendItemId(selectedDocument.id);
      setShowExtendModal(true);
    }
  };

  // Handle extend validity save
  const handleExtendValiditySave = async (newValidTo: string) => {
    if (!extendItemId) return;
    
    if (extendDocType === 'insurance') {
      await updateInsurance(extendItemId, { validTo: newValidTo });
      await data.insurances.refetch();
    } else {
      await updateVehicleDocument(extendItemId, { validTo: newValidTo });
      if (extendDocType === 'stk') await data.stk.refetch();
      else if (extendDocType === 'ek') await data.ek.refetch();
      else await data.vignettes.refetch();
    }
    
    setExtendItemId(null);
  };

  // Handle view files from action sheet
  const handleViewFiles = async () => {
    const filePaths = selectedInsurance?.filePaths || selectedDocument?.filePaths || [];
    if (filePaths.length === 0) {
      Alert.alert('Info', 'Dokument nemá priradené súbory');
      return;
    }
    
    try {
      // Get signed URLs for all files, filtering out failed ones
      const signedUrlResults = await Promise.allSettled(
        filePaths.map(path => getSignedUrl(path))
      );
      
      const signedUrls = signedUrlResults
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);
      
      if (signedUrls.length === 0) {
        Alert.alert(
          'Súbory nenájdené',
          'Žiadne súbory neboli nájdené v úložisku. Možno boli zmazané alebo neboli správne nahrané.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Show warning if some files were missing
      if (signedUrls.length < filePaths.length) {
        console.warn(`Only ${signedUrls.length} of ${filePaths.length} files were found`);
      }
      
      setViewerFiles(signedUrls);
      setViewerTitle(
        selectedInsurance 
          ? INSURANCE_TYPE_LABELS[selectedInsurance.type]
          : selectedDocument 
          ? DOCUMENT_TYPE_LABELS[selectedDocument.documentType]
          : 'Dokumenty'
      );
      setShowDocumentViewer(true);
    } catch (error) {
      console.error('Error getting signed URLs:', error);
      Alert.alert('Chyba', 'Nepodarilo sa načítať dokumenty');
    }
  };

  // Handle delete from action sheet
  const handleDelete = () => {
    if (selectedInsurance) {
      Alert.alert(
        'Odstrániť poistku',
        `Naozaj chcete odstrániť poistku ${selectedInsurance.policyNumber}?`,
        [
          { text: 'Zrušiť', style: 'cancel' },
          {
            text: 'Odstrániť',
            style: 'destructive',
            onPress: () => data.insurances.remove(selectedInsurance.id),
          },
        ]
      );
    } else if (selectedDocument) {
      Alert.alert(
        'Odstrániť dokument',
        'Naozaj chcete odstrániť tento dokument?',
        [
          { text: 'Zrušiť', style: 'cancel' },
          {
            text: 'Odstrániť',
            style: 'destructive',
            onPress: async () => {
              if (selectedDocument.documentType === 'stk') await data.stk.remove(selectedDocument.id);
              else if (selectedDocument.documentType === 'ek') await data.ek.remove(selectedDocument.id);
              else await data.vignettes.remove(selectedDocument.id);
            },
          },
        ]
      );
    }
  };

  // Get action sheet title and subtitle
  const getActionSheetInfo = () => {
    if (selectedInsurance) {
      return {
        title: INSURANCE_TYPE_LABELS[selectedInsurance.type],
        subtitle: selectedInsurance.policyNumber,
        hasFiles: (selectedInsurance.filePaths?.length || 0) > 0,
      };
    } else if (selectedDocument) {
      return {
        title: DOCUMENT_TYPE_LABELS[selectedDocument.documentType],
        subtitle: selectedDocument.documentNumber || undefined,
        hasFiles: (selectedDocument.filePaths?.length || 0) > 0,
      };
    }
    return { title: '', subtitle: undefined, hasFiles: false };
  };

  // Render content based on active tab
  const renderContent = () => {
    if (data.isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Načítavam...
          </Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'insurances':
        if (data.insurances.insurances.length === 0) {
          return renderEmptyState('shield-checkmark', 'Zatiaľ nemáte žiadne poistky');
        }
        return (
          <View style={styles.cardList}>
            {data.insurances.insurances.map(ins => (
              <InsuranceCard
                key={ins.id}
                insurance={ins}
                onPress={() => handleInsurancePress(ins)}
                onLongPress={() => handleInsurancePress(ins)}
              />
            ))}
          </View>
        );

      case 'stk':
        if (data.stk.documents.length === 0) {
          return renderEmptyState('document-text', 'Zatiaľ nemáte žiadne STK');
        }
        return (
          <View style={styles.cardList}>
            {data.stk.documents.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPress={() => handleDocumentPress(doc)}
                onLongPress={() => handleDocumentPress(doc)}
              />
            ))}
          </View>
        );

      case 'ek':
        if (data.ek.documents.length === 0) {
          return renderEmptyState('cloud-outline', 'Zatiaľ nemáte žiadne emisné kontroly');
        }
        return (
          <View style={styles.cardList}>
            {data.ek.documents.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPress={() => handleDocumentPress(doc)}
                onLongPress={() => handleDocumentPress(doc)}
              />
            ))}
          </View>
        );

      case 'vignettes':
        if (data.vignettes.documents.length === 0) {
          return renderEmptyState('ticket-outline', 'Zatiaľ nemáte žiadne dialničné známky');
        }
        return (
          <View style={styles.cardList}>
            {data.vignettes.documents.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPress={() => handleDocumentPress(doc)}
                onLongPress={() => handleDocumentPress(doc)}
              />
            ))}
          </View>
        );

      case 'service':
        if (data.service.records.length === 0) {
          return renderEmptyState('construct-outline', 'Zatiaľ nemáte žiadne servisné záznamy');
        }
        return (
          <View style={styles.cardList}>
            {data.service.records.map(record => (
              <View
                key={record.id}
                style={[styles.serviceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View style={styles.serviceHeader}>
                  <Text style={[styles.serviceDate, { color: theme.colors.text }]}>
                    {new Date(record.serviceDate).toLocaleDateString('sk-SK')}
                  </Text>
                  {record.price && (
                    <Text style={[styles.servicePrice, { color: theme.colors.primary }]}>
                      {Number(record.price).toLocaleString('sk-SK')}€
                    </Text>
                  )}
                </View>
                {record.serviceProvider && (
                  <Text style={[styles.serviceProvider, { color: theme.colors.textSecondary }]}>
                    {record.serviceProvider}
                  </Text>
                )}
                {record.description && (
                  <Text style={[styles.serviceDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {record.description}
                  </Text>
                )}
                {record.kmState && (
                  <Text style={[styles.serviceKm, { color: theme.colors.textSecondary }]}>
                    {record.kmState.toLocaleString('sk-SK')} km
                  </Text>
                )}
              </View>
            ))}
          </View>
        );

      case 'fines':
        if (data.fines.fines.length === 0) {
          return renderEmptyState('warning-outline', 'Zatiaľ nemáte žiadne pokuty');
        }
        return (
          <View style={styles.cardList}>
            {data.fines.fines.map(fine => (
              <View
                key={fine.id}
                style={[
                  styles.fineCard,
                  { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: fine.isPaid ? theme.colors.border : 'rgba(239, 68, 68, 0.3)' 
                  }
                ]}
              >
                <View style={styles.fineHeader}>
                  <Text style={[styles.fineDate, { color: theme.colors.text }]}>
                    {new Date(fine.fineDate).toLocaleDateString('sk-SK')}
                  </Text>
                  <View style={[
                    styles.fineBadge,
                    { backgroundColor: fine.isPaid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                  ]}>
                    <Text style={[
                      styles.fineBadgeText,
                      { color: fine.isPaid ? '#22c55e' : '#ef4444' }
                    ]}>
                      {fine.isPaid ? 'Zaplatená' : 'Nezaplatená'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.fineAmount, { color: theme.colors.text }]}>
                  {Number(fine.fineAmount).toLocaleString('sk-SK')}€
                </Text>
                {fine.description && (
                  <Text style={[styles.fineDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {fine.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  const renderEmptyState = (icon: keyof typeof Ionicons.glyphMap, message: string) => (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={48} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Dokumenty</Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(tab => {
          const badge = getTabBadge(tab.id);
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                isActive && { backgroundColor: theme.colors.surface },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? theme.colors.text : theme.colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
              {badge > 0 && (
                <View style={[
                  styles.badge,
                  { backgroundColor: badge > 0 && activeTab !== tab.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent' }
                ]}>
                  <Text style={[styles.badgeText, { color: '#f97316' }]}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={data.isLoading}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {renderContent()}
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={handleOpenAddModal}
        icon={<Plus size={24} color="#fff" />}
        backgroundColor={theme.colors.primary}
        style={styles.fab}
      />

      {/* Add/Edit Document Modal */}
      {householdId && (
        <AddDocumentModal
          visible={showAddModal}
          documentType={addDocumentType}
          householdId={householdId}
          editData={editData}
          onSave={handleSaveDocument}
          onClose={() => {
            setShowAddModal(false);
            setEditData(undefined);
          }}
        />
      )}

      {/* Action Sheet */}
      <DocumentActionSheet
        visible={showActionSheet}
        title={getActionSheetInfo().title}
        subtitle={getActionSheetInfo().subtitle}
        hasFiles={getActionSheetInfo().hasFiles}
        onClose={handleCloseActionSheet}
        onEdit={handleEdit}
        onExtend={handleExtendValidity}
        onViewFiles={handleViewFiles}
        onDelete={handleDelete}
      />

      {/* Document Viewer */}
      <DocumentViewer
        visible={showDocumentViewer}
        files={viewerFiles}
        title={viewerTitle}
        onClose={() => {
          setShowDocumentViewer(false);
          setViewerFiles([]);
        }}
      />

      {/* Extend Validity Modal */}
      <ExtendValidityModal
        visible={showExtendModal}
        documentType={extendDocType}
        currentValidTo={extendCurrentValidTo}
        paymentFrequency={extendPaymentFrequency}
        onExtend={handleExtendValiditySave}
        onClose={() => {
          setShowExtendModal(false);
          setExtendItemId(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  tabsContainer: {
    maxHeight: 56,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  cardList: {
    gap: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  serviceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  serviceProvider: {
    fontSize: 14,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  serviceKm: {
    fontSize: 12,
  },
  fineCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  fineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fineDate: {
    fontSize: 14,
  },
  fineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fineAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  fineDescription: {
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
  },
});

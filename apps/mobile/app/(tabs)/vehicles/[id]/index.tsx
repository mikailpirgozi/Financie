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
import { FileText, Upload } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';

import { useTheme } from '@/contexts/ThemeContext';
import { useVehicle } from '@/hooks';
import { deleteVehicle, createVehicleDocument, getCurrentHousehold, uploadFile, getSignedUrl } from '@/lib/api';
import { ErrorMessage } from '@/components/ErrorMessage';
import { DocumentListItem } from '@/components/common';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { DOCUMENT_TYPE_LABELS } from '@finapp/core';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | undefined): string {
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

export default function VehicleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  
  // Document viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<string[]>([]);
  const [viewerTitle, setViewerTitle] = useState('Dokument');

  const { vehicle, isLoading, error, refetch } = useVehicle(id || null);
  
  // Load household on mount
  React.useEffect(() => {
    getCurrentHousehold().then(h => setHouseholdId(h.id)).catch(console.error);
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
    Alert.alert(
      'Zmazať vozidlo',
      `Naozaj chcete zmazať "${vehicle?.name}"?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVehicle(id!);
              // Navigate to vehicles list after delete
              router.replace('/(tabs)/vehicles');
            } catch (err) {
              Alert.alert('Chyba', 'Nepodarilo sa zmazať vozidlo');
            }
          },
        },
      ]
    );
  };

  const handleViewDocument = async (filePath: string, title?: string) => {
    if (!filePath || filePath.trim() === '') {
      Alert.alert('Info', 'Dokument nemá priradený súbor');
      return;
    }
    
    // Debug: log the file path being requested
    console.log('📄 Requesting document with path:', filePath);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // Get signed URL for private storage bucket
      const signedUrl = await getSignedUrl(filePath);
      console.log('✅ Got signed URL successfully');
      setViewerFiles([signedUrl]);
      setViewerTitle(title || 'Dokument');
      setViewerVisible(true);
    } catch (error) {
      console.error('Error getting signed URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Neznáma chyba';
      
      if (errorMessage.includes('Object not found') || errorMessage.includes('not found')) {
        Alert.alert(
          'Súbor nenájdený',
          `Dokument nebol nájdený v úložisku.\n\nCesta: ${filePath}\n\nMožno bol zmazaný alebo nebol správne nahraný.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Chyba', `Nepodarilo sa načítať dokument: ${errorMessage}`);
      }
    }
  };

  const handleUploadTechCertificate = async () => {
    if (!householdId || !id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setIsUploading(true);

      // Upload file to storage (with auth)
      const uploadData = await uploadFile({
        uri: file.uri,
        type: file.mimeType || 'application/pdf',
        name: file.name,
        householdId,
        folder: 'vehicles',
        recordId: id,
      });

      // Create vehicle document record
      await createVehicleDocument({
        householdId,
        assetId: id,
        documentType: 'technical_certificate',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString().split('T')[0],
        filePaths: [uploadData.data.path],
        notes: `Technický preukaz - ${file.name}`,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Úspech', 'Technický preukaz bol nahraný');
      refetch();
    } catch (error) {
      console.error('Upload error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Chyba', 'Nepodarilo sa nahrať dokument');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/vehicles')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Vozidlo</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !vehicle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/vehicles')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Vozidlo</Text>
          <View style={{ width: 40 }} />
        </View>
        <ErrorMessage message={error || 'Vozidlo nenájdené'} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const vehicleTitle = vehicle.make && vehicle.model 
    ? `${vehicle.make} ${vehicle.model}`
    : vehicle.name;

  const equity = vehicle.currentValue - vehicle.totalLoanBalance;
  const hasAlerts = vehicle.stkExpiringSoon || vehicle.ekExpiringSoon || vehicle.insuranceExpiringSoon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/vehicles')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {vehicleTitle}
        </Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Alerts */}
        {hasAlerts && (
          <View style={[styles.alertCard, { backgroundColor: theme.colors.warning + '20' }]}>
            <Ionicons name="warning" size={20} color={theme.colors.warning} />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: theme.colors.warning }]}>Upozornenia</Text>
              {vehicle.stkExpiringSoon && (
                <Text style={[styles.alertText, { color: theme.colors.warning }]}>
                  • STK končí {formatDate(vehicle.stkExpiry)}
                </Text>
              )}
              {vehicle.ekExpiringSoon && (
                <Text style={[styles.alertText, { color: theme.colors.warning }]}>
                  • EK končí {formatDate(vehicle.ekExpiry)}
                </Text>
              )}
              {vehicle.insuranceExpiringSoon && (
                <Text style={[styles.alertText, { color: theme.colors.warning }]}>
                  • Poistenie končí {formatDate(vehicle.nearestInsuranceExpiry)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="car" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{vehicleTitle}</Text>
              {vehicle.licensePlate && (
                <Text style={[styles.licensePlate, { color: theme.colors.text, backgroundColor: theme.colors.border }]}>
                  {vehicle.licensePlate}
                </Text>
              )}
              {vehicle.registeredCompany && (
                <View style={styles.companyRow}>
                  <Ionicons name="business-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.companyText, { color: theme.colors.textSecondary }]}>
                    {vehicle.registeredCompany}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(vehicle.currentValue)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Hodnota
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(vehicle.totalLoanBalance)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Úver
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statValue, { color: equity >= 0 ? theme.colors.success : theme.colors.error }]}>
              {formatCurrency(equity)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Equity
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(vehicle.totalCostOfOwnership)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              TCO
            </Text>
          </View>
        </View>

        {/* Technical Info */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Technické údaje</Text>
          <View style={styles.infoGrid}>
            {vehicle.year && (
              <InfoRow label="Rok výroby" value={vehicle.year.toString()} colors={theme.colors} />
            )}
            {vehicle.fuelType && (
              <InfoRow label="Palivo" value={FUEL_TYPE_LABELS[vehicle.fuelType] || vehicle.fuelType} colors={theme.colors} />
            )}
            {vehicle.transmission && (
              <InfoRow label="Prevodovka" value={TRANSMISSION_LABELS[vehicle.transmission] || vehicle.transmission} colors={theme.colors} />
            )}
            {vehicle.enginePower && (
              <InfoRow label="Výkon" value={`${vehicle.enginePower} kW`} colors={theme.colors} />
            )}
            {vehicle.mileage && (
              <InfoRow label="Najazdené" value={`${vehicle.mileage.toLocaleString('sk-SK')} km`} colors={theme.colors} />
            )}
            {vehicle.vin && (
              <InfoRow label="VIN" value={vehicle.vin} colors={theme.colors} />
            )}
          </View>
        </View>

        {/* Linked Items Summary */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Prepojené záznamy</Text>
          <View style={styles.linkedGrid}>
            <LinkedItem 
              icon="wallet-outline" 
              label="Úvery" 
              count={vehicle.loanCount}
              value={vehicle.totalLoanBalance > 0 ? formatCurrency(vehicle.totalLoanBalance) : undefined}
              colors={theme.colors}
            />
            <LinkedItem 
              icon="shield-checkmark-outline" 
              label="Poistky" 
              count={vehicle.activeInsuranceCount}
              alert={vehicle.insuranceExpiringSoon}
              colors={theme.colors}
            />
            <LinkedItem 
              icon="document-text-outline" 
              label="STK/EK" 
              count={vehicle.validDocumentCount}
              alert={vehicle.stkExpiringSoon || vehicle.ekExpiringSoon}
              colors={theme.colors}
            />
            <LinkedItem 
              icon="construct-outline" 
              label="Servis" 
              count={vehicle.serviceCount}
              value={vehicle.totalServiceCost > 0 ? formatCurrency(vehicle.totalServiceCost) : undefined}
              colors={theme.colors}
            />
            <LinkedItem 
              icon="warning-outline" 
              label="Pokuty" 
              count={vehicle.fineCount}
              alert={vehicle.unpaidFineCount > 0}
              colors={theme.colors}
            />
          </View>
        </View>

        {/* Documents Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <FileText size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                Dokumenty
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleUploadTechCertificate}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Upload size={16} color="#fff" />
                  <Text style={styles.uploadButtonText}>Nahrať TP</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Document list from linked items */}
          {'linkedItems' in vehicle && vehicle.linkedItems?.documents && vehicle.linkedItems.documents.length > 0 ? (
            <View style={styles.documentsList}>
              {vehicle.linkedItems.documents.map((doc) => {
                // Use raw file path for signed URL generation
                const firstFilePath = doc.filePaths?.[0] || '';
                const docName = doc.notes || DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof DOCUMENT_TYPE_LABELS] || doc.documentType;
                
                return (
                  <DocumentListItem
                    key={doc.id}
                    id={doc.id}
                    name={docName}
                    documentType={doc.documentType}
                    documentTypeLabel={DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof DOCUMENT_TYPE_LABELS] || doc.documentType}
                    filePath={firstFilePath}
                    createdAt={doc.validTo}
                    showType={!doc.notes}
                    onView={(path) => handleViewDocument(path, docName)}
                  />
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyDocuments}>
              <FileText size={32} color={theme.colors.textMuted} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Žiadne dokumenty
              </Text>
              <Text style={[styles.emptyHint, { color: theme.colors.textMuted }]}>
                Nahrajte technický preukaz vozidla
              </Text>
            </View>
          )}
        </View>

        {/* All Files Section - aggregated from all linked entities */}
        {'linkedItems' in vehicle && vehicle.linkedItems?.allFiles && vehicle.linkedItems.allFiles.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="folder-open-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                  Všetky súbory ({vehicle.linkedItems.allFiles.length})
                </Text>
              </View>
            </View>

            <View style={styles.documentsList}>
              {vehicle.linkedItems.allFiles.map((file) => {
                // Use raw file path for signed URL generation
                const categoryLabel = FILE_CATEGORY_LABELS[file.category as keyof typeof FILE_CATEGORY_LABELS] || file.category;
                
                return (
                  <DocumentListItem
                    key={file.id}
                    id={file.id}
                    name={file.name}
                    documentType={file.category}
                    documentTypeLabel={categoryLabel}
                    filePath={file.filePath}
                    createdAt={file.date}
                    showType={true}
                    onView={(path) => handleViewDocument(path, file.name)}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity 
          style={[styles.deleteButton, { backgroundColor: theme.colors.error + '10' }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>
            Zmazať vozidlo
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Document Viewer Modal */}
      <DocumentViewer
        visible={viewerVisible}
        files={viewerFiles}
        onClose={() => setViewerVisible(false)}
        title={viewerTitle}
      />
    </SafeAreaView>
  );
}

// Labels for file categories
const FILE_CATEGORY_LABELS: Record<string, string> = {
  stk: 'STK',
  ek: 'Emisná kontrola',
  vignette: 'Dialničná známka',
  technical_certificate: 'Technický preukaz',
  insurance: 'Poistka',
  service: 'Servis',
  fine: 'Pokuta',
  loan: 'Úver',
};

interface InfoRowProps {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string; border: string };
}

function InfoRow({ label, value, colors }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

interface LinkedItemProps {
  icon: string;
  label: string;
  count: number;
  value?: string;
  alert?: boolean;
  colors: { text: string; textSecondary: string; warning: string; primary: string };
}

function LinkedItem({ icon, label, count, value, alert, colors }: LinkedItemProps) {
  return (
    <View style={styles.linkedItem}>
      <Ionicons 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={icon as any} 
        size={24} 
        color={alert ? colors.warning : colors.primary} 
      />
      <Text style={[styles.linkedLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.linkedCount, { color: alert ? colors.warning : colors.text }]}>
        {count}
      </Text>
      {value && (
        <Text style={[styles.linkedValue, { color: colors.textSecondary }]}>{value}</Text>
      )}
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  alertCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
  },
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
  infoGrid: {},
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
  linkedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  linkedItem: {
    alignItems: 'center',
    width: '28%',
  },
  linkedLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  linkedCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  linkedValue: {
    fontSize: 10,
  },
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  documentsList: {
    gap: 0,
  },
  emptyDocuments: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
});

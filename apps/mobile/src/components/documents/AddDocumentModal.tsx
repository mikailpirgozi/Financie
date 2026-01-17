import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { X, Calendar, Car, Building, Euro, FileText, ChevronDown, Plus, Search, Paperclip, File, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { SegmentControl, SegmentOption } from '../ui/SegmentControl';
import { Button } from '../ui/Button';
import { getInsurers, createInsurer, getVehicles, uploadFile, type Vehicle } from '../../lib/api';
import type {
  InsuranceType,
  PaymentFrequency,
  DocumentType,
  ServiceType,
  VignetteCountry,
  Insurer,
} from '@finapp/core';
import { calculateValidToDate } from '@finapp/core';

// ============================================
// TYPES
// ============================================

export type DocumentCategory = 'insurance' | 'stk' | 'ek' | 'vignette' | 'service' | 'fine';

// Edit data types for pre-filling the form
export interface EditInsuranceData {
  id: string;
  insuranceType: InsuranceType;
  policyNumber: string;
  company?: string;
  insurerId?: string;
  assetId?: string;
  validFrom: string;
  validTo: string;
  price: number;
  paymentFrequency: PaymentFrequency;
  notes?: string;
  filePaths?: string[];
}

export interface EditVehicleDocumentData {
  id: string;
  documentType: DocumentType;
  validFrom?: string;
  validTo: string;
  documentNumber?: string;
  price?: number;
  country?: VignetteCountry;
  notes?: string;
  filePaths?: string[];
}

export interface EditServiceRecordData {
  id: string;
  serviceDate: string;
  serviceType?: ServiceType;
  serviceProvider?: string;
  kmState?: number;
  price?: number;
  description?: string;
  notes?: string;
  filePaths?: string[];
}

export interface EditFineData {
  id: string;
  fineDate: string;
  fineAmount: number;
  fineAmountLate?: number;
  country?: string;
  enforcementCompany?: string;
  isPaid: boolean;
  description?: string;
  filePaths?: string[];
}

export type EditData = EditInsuranceData | EditVehicleDocumentData | EditServiceRecordData | EditFineData;

interface AddDocumentModalProps {
  visible: boolean;
  documentType: DocumentCategory;
  householdId?: string;
  editData?: EditData;
  onSave: (data: InsuranceFormData | VehicleDocumentFormData | ServiceRecordFormData | FineFormData, editId?: string) => Promise<void>;
  onClose: () => void;
}

export interface InsuranceFormData {
  type: 'insurance';
  insuranceType: InsuranceType;
  policyNumber: string;
  company: string;
  insurerId?: string;
  assetId?: string;
  validFrom: string;
  validTo: string;
  price: number;
  paymentFrequency: PaymentFrequency;
  notes?: string;
  filePaths?: string[];
}

export interface VehicleDocumentFormData {
  type: 'vehicleDocument';
  documentType: DocumentType;
  assetId: string;
  validFrom?: string;
  validTo: string;
  documentNumber?: string;
  price?: number;
  country?: VignetteCountry;
  notes?: string;
  filePaths?: string[];
}

export interface ServiceRecordFormData {
  type: 'serviceRecord';
  assetId: string;
  serviceDate: string;
  serviceType?: ServiceType;
  serviceProvider?: string;
  kmState?: number;
  price?: number;
  description?: string;
  notes?: string;
  filePaths?: string[];
}

export interface FineFormData {
  type: 'fine';
  assetId?: string;
  fineDate: string;
  fineAmount: number;
  fineAmountLate?: number;
  country?: string;
  enforcementCompany?: string;
  isPaid: boolean;
  description?: string;
  filePaths?: string[];
}

// ============================================
// OPTIONS
// ============================================

const insuranceTypeOptions: SegmentOption<InsuranceType>[] = [
  { value: 'pzp', label: 'PZP' },
  { value: 'kasko', label: 'Kasko' },
  { value: 'pzp_kasko', label: 'PZP+Kasko' },
];

const paymentFrequencyOptions: SegmentOption<PaymentFrequency>[] = [
  { value: 'yearly', label: 'Ročne' },
  { value: 'biannual', label: 'Polročne' },
  { value: 'quarterly', label: 'Štvrťročne' },
  { value: 'monthly', label: 'Mesačne' },
];

// Slovak insurance companies (default list)
const SLOVAK_INSURERS = [
  'Allianz - Slovenská poisťovňa',
  'Kooperativa poisťovňa',
  'Generali Poisťovňa',
  'ČSOB Poisťovňa',
  'UNIQA poisťovňa',
  'AXA pojišťovna',
  'Union poisťovňa',
  'Wüstenrot poisťovňa',
  'NN Životná poisťovňa',
  'MetLife Europe',
  'Komunálna poisťovňa',
  'PREMIUM Insurance Company',
  'Groupama poisťovňa',
  'Aegon Životná poisťovňa',
  'Cardif Slovakia',
  'Poisťovňa Poštovej banky',
  'NOVIS Insurance Company',
];

const serviceTypeOptions: SegmentOption<ServiceType>[] = [
  { value: 'regular', label: 'Pravidelny' },
  { value: 'repair', label: 'Oprava' },
  { value: 'tire_change', label: 'Prezutie' },
  { value: 'other', label: 'Ine' },
];

const vignetteCountryOptions: SegmentOption<VignetteCountry>[] = [
  { value: 'SK', label: 'SK' },
  { value: 'CZ', label: 'CZ' },
  { value: 'AT', label: 'AT' },
  { value: 'HU', label: 'HU' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDocumentTypeLabel(type: DocumentCategory): string {
  switch (type) {
    case 'insurance': return 'Poistka';
    case 'stk': return 'STK';
    case 'ek': return 'Emisna kontrola';
    case 'vignette': return 'Dialnicna znamka';
    case 'service': return 'Servisny zaznam';
    case 'fine': return 'Pokuta';
    default: return 'Dokument';
  }
}

// ============================================
// COMPONENT
// ============================================

export function AddDocumentModal({
  visible,
  documentType,
  householdId,
  editData,
  onSave,
  onClose,
}: AddDocumentModalProps) {
  const isEditMode = !!editData;
  const { theme } = useTheme();
  const colors = theme.colors;

  // Animation values
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  // Common state
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'validFrom' | 'validTo' | 'serviceDate' | 'fineDate' | null>(null);

  // Insurance form state
  const [insuranceType, setInsuranceType] = useState<InsuranceType>('pzp');
  const [policyNumber, setPolicyNumber] = useState('');
  const [company, setCompany] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('yearly');
  
  // Insurer picker state
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [selectedInsurerId, setSelectedInsurerId] = useState<string | null>(null);
  const [showInsurerPicker, setShowInsurerPicker] = useState(false);
  const [insurerSearchQuery, setInsurerSearchQuery] = useState('');
  const [_isLoadingInsurers, setIsLoadingInsurers] = useState(false);
  const [showAddInsurer, setShowAddInsurer] = useState(false);
  const [newInsurerName, setNewInsurerName] = useState('');
  const [isAddingInsurer, setIsAddingInsurer] = useState(false);
  
  // Vehicle picker state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [_isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<{ name: string; uri: string }[]>([]);
  
  // Vehicle document form state
  const [documentNumber, setDocumentNumber] = useState('');
  const [country, setCountry] = useState<VignetteCountry>('SK');
  
  // Service record form state
  const [serviceType, setServiceType] = useState<ServiceType>('regular');
  const [serviceProvider, setServiceProvider] = useState('');
  const [kmState, setKmState] = useState('');
  const [description, setDescription] = useState('');
  
  // Fine form state
  const [fineAmount, setFineAmount] = useState('');
  const [enforcementCompany, setEnforcementCompany] = useState('');
  const [isPaid, setIsPaid] = useState(false);

  // Common date fields
  const [validFrom, setValidFrom] = useState(new Date());
  const [validTo, setValidTo] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });
  const [serviceDate, setServiceDate] = useState(new Date());
  const [fineDate, setFineDate] = useState(new Date());
  
  // Price field (common)
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
      // Load insurers for insurance type
      if (documentType === 'insurance' && householdId) {
        loadInsurers();
      }
      // Load vehicles for all document types
      if (householdId) {
        loadVehicles();
      }
    }
  }, [visible, documentType, householdId]);

  // Load insurers from API
  const loadInsurers = useCallback(async () => {
    if (!householdId) return;
    setIsLoadingInsurers(true);
    try {
      const response = await getInsurers(householdId);
      setInsurers(response.data);
    } catch (error) {
      console.error('Failed to load insurers:', error);
    } finally {
      setIsLoadingInsurers(false);
    }
  }, [householdId]);

  // Load vehicles from API
  const loadVehicles = useCallback(async () => {
    if (!householdId) return;
    setIsLoadingVehicles(true);
    try {
      const response = await getVehicles(householdId);
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setIsLoadingVehicles(false);
    }
  }, [householdId]);

  // Auto-calculate validTo when payment frequency or validFrom changes (for insurance)
  useEffect(() => {
    if (documentType === 'insurance') {
      const newValidTo = calculateValidToDate(formatDate(validFrom), paymentFrequency);
      if (newValidTo) {
        setValidTo(new Date(newValidTo));
      }
    }
  }, [paymentFrequency, validFrom, documentType]);

  // Auto-calculate validTo for STK/EK (2 years) when validFrom changes
  useEffect(() => {
    if (documentType === 'stk' || documentType === 'ek') {
      const newValidTo = new Date(validFrom);
      newValidTo.setFullYear(newValidTo.getFullYear() + 2);
      setValidTo(newValidTo);
    }
  }, [validFrom, documentType]);

  // Handle adding new insurer
  const handleAddInsurer = async () => {
    if (!householdId || !newInsurerName.trim()) return;
    
    setIsAddingInsurer(true);
    try {
      const response = await createInsurer({
        householdId,
        name: newInsurerName.trim(),
      });
      setInsurers(prev => [...prev, response.data]);
      setSelectedInsurerId(response.data.id);
      setCompany(response.data.name);
      setNewInsurerName('');
      setShowAddInsurer(false);
      setShowInsurerPicker(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Chyba', 'Nepodarilo sa pridať poisťovňu');
    } finally {
      setIsAddingInsurer(false);
    }
  };

  // Handle selecting an insurer
  const handleSelectInsurer = (insurer: Insurer | { id: string; name: string }) => {
    setSelectedInsurerId(insurer.id);
    setCompany(insurer.name);
    setShowInsurerPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle selecting a vehicle
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setShowVehiclePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Get selected vehicle display name
  const getSelectedVehicleName = () => {
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return '';
    const licensePlate = vehicle.licensePlate ? ` (${vehicle.licensePlate})` : '';
    return `${vehicle.name}${licensePlate}`;
  };

  // Filter vehicles by search query
  const getFilteredVehicles = useCallback(() => {
    if (!vehicleSearchQuery.trim()) return vehicles;
    const query = vehicleSearchQuery.toLowerCase();
    return vehicles.filter(v => 
      v.name.toLowerCase().includes(query) ||
      (v.licensePlate?.toLowerCase().includes(query)) ||
      (v.make?.toLowerCase().includes(query)) ||
      (v.model?.toLowerCase().includes(query))
    );
  }, [vehicles, vehicleSearchQuery]);

  // Handle file selection
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => ({
          name: asset.name,
          uri: asset.uri,
        }));
        setSelectedFiles(prev => [...prev, ...newFiles]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  // Remove selected file
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Get combined insurers list (API + defaults)
  const getAllInsurers = useCallback(() => {
    const apiInsurerNames = insurers.map(i => i.name.toLowerCase());
    const defaultsToAdd = SLOVAK_INSURERS.filter(
      name => !apiInsurerNames.includes(name.toLowerCase())
    ).map((name, index) => ({
      id: `default-${index}`,
      name,
      isDefault: true,
    }));
    return [...insurers, ...defaultsToAdd];
  }, [insurers]);

  // Filter insurers by search
  const getFilteredInsurers = useCallback(() => {
    const all = getAllInsurers();
    if (!insurerSearchQuery.trim()) return all;
    return all.filter(i => 
      i.name.toLowerCase().includes(insurerSearchQuery.toLowerCase())
    );
  }, [getAllInsurers, insurerSearchQuery]);

  // Animate modal
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  const resetForm = () => {
    // If in edit mode, pre-fill the form with existing data
    if (editData) {
      populateFormFromEditData();
      return;
    }
    
    // Default reset for new document
    setInsuranceType('pzp');
    setPolicyNumber('');
    setCompany('');
    setPaymentFrequency('yearly');
    setDocumentNumber('');
    setCountry('SK');
    setServiceType('regular');
    setServiceProvider('');
    setKmState('');
    setDescription('');
    setFineAmount('');
    setEnforcementCompany('');
    setIsPaid(false);
    setValidFrom(new Date());
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setValidTo(nextYear);
    setServiceDate(new Date());
    setFineDate(new Date());
    setPrice('');
    setNotes('');
    // Reset insurer state
    setSelectedInsurerId(null);
    setInsurerSearchQuery('');
    setShowAddInsurer(false);
    setNewInsurerName('');
    // Reset vehicle state
    setSelectedVehicleId(null);
    setVehicleSearchQuery('');
    // Reset files
    setSelectedFiles([]);
  };

  const populateFormFromEditData = () => {
    if (!editData) return;

    // Common fields
    setNotes((editData as { notes?: string }).notes || '');
    
    // Populate files if available
    const filePaths = (editData as { filePaths?: string[] }).filePaths || [];
    setSelectedFiles(filePaths.map((uri, index) => ({
      name: `Dokument ${index + 1}`,
      uri,
    })));

    if (documentType === 'insurance' && 'insuranceType' in editData) {
      const data = editData as EditInsuranceData;
      setInsuranceType(data.insuranceType);
      setPolicyNumber(data.policyNumber);
      setCompany(data.company || '');
      setSelectedInsurerId(data.insurerId || null);
      setSelectedVehicleId(data.assetId || null);
      setValidFrom(new Date(data.validFrom));
      setValidTo(new Date(data.validTo));
      setPrice(data.price.toString());
      setPaymentFrequency(data.paymentFrequency);
    } else if ((documentType === 'stk' || documentType === 'ek' || documentType === 'vignette') && 'documentType' in editData) {
      const data = editData as EditVehicleDocumentData;
      setDocumentNumber(data.documentNumber || '');
      if (data.validFrom) setValidFrom(new Date(data.validFrom));
      setValidTo(new Date(data.validTo));
      setPrice(data.price?.toString() || '');
      if (data.country) setCountry(data.country);
    } else if (documentType === 'service' && 'serviceDate' in editData) {
      const data = editData as EditServiceRecordData;
      setServiceDate(new Date(data.serviceDate));
      setServiceType(data.serviceType || 'regular');
      setServiceProvider(data.serviceProvider || '');
      setKmState(data.kmState?.toString() || '');
      setPrice(data.price?.toString() || '');
      setDescription(data.description || '');
    } else if (documentType === 'fine' && 'fineDate' in editData) {
      const data = editData as EditFineData;
      setFineDate(new Date(data.fineDate));
      setFineAmount(data.fineAmount.toString());
      setEnforcementCompany(data.enforcementCompany || '');
      setIsPaid(data.isPaid);
      setDescription(data.description || '');
    }
  };


  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const validateForm = (): boolean => {
    switch (documentType) {
      case 'insurance':
        if (!policyNumber.trim()) {
          Alert.alert('Chyba', 'Zadajte číslo poistky');
          return false;
        }
        if (!company.trim()) {
          Alert.alert('Chyba', 'Vyberte poisťovňu');
          return false;
        }
        if (!price || parseFloat(price) <= 0) {
          Alert.alert('Chyba', 'Zadajte platnú cenu');
          return false;
        }
        return true;

      case 'stk':
      case 'ek':
      case 'vignette':
        if (!selectedVehicleId) {
          Alert.alert('Chyba', 'Vyberte vozidlo');
          return false;
        }
        return true;

      case 'service':
        if (!selectedVehicleId) {
          Alert.alert('Chyba', 'Vyberte vozidlo');
          return false;
        }
        return true;

      case 'fine':
        if (!fineAmount || parseFloat(fineAmount) <= 0) {
          Alert.alert('Chyba', 'Zadajte sumu pokuty');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Upload files to Supabase Storage first
      const uploadedFilePaths: string[] = [];
      
      if (selectedFiles.length > 0 && householdId) {
        console.log(`📤 Uploading ${selectedFiles.length} files...`);
        
        // Determine folder based on document type
        const folderMap: Record<DocumentCategory, string> = {
          insurance: 'insurances',
          stk: 'stk',
          ek: 'ek',
          vignette: 'vignettes',
          service: 'service',
          fine: 'fines',
        };
        const folder = folderMap[documentType] || 'documents';
        
        // Upload each file
        for (const file of selectedFiles) {
          try {
            // Determine mime type from file extension
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            const mimeTypes: Record<string, string> = {
              pdf: 'application/pdf',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              png: 'image/png',
              gif: 'image/gif',
              webp: 'image/webp',
            };
            const mimeType = mimeTypes[extension] || 'application/octet-stream';
            
            const result = await uploadFile({
              uri: file.uri,
              type: mimeType,
              name: file.name,
              householdId,
              folder,
            });
            
            console.log(`✅ Uploaded: ${file.name} -> ${result.data.path}`);
            uploadedFilePaths.push(result.data.path);
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${file.name}:`, uploadError);
            // Continue with other files even if one fails
          }
        }
      }
      
      let formData: InsuranceFormData | VehicleDocumentFormData | ServiceRecordFormData | FineFormData;

      switch (documentType) {
        case 'insurance':
          formData = {
            type: 'insurance',
            insuranceType,
            policyNumber: policyNumber.trim(),
            company: company.trim(),
            insurerId: selectedInsurerId && !selectedInsurerId.startsWith('default-') ? selectedInsurerId : undefined,
            assetId: selectedVehicleId || undefined,
            validFrom: formatDate(validFrom),
            validTo: formatDate(validTo),
            price: parseFloat(price),
            paymentFrequency,
            notes: notes.trim() || undefined,
            filePaths: uploadedFilePaths.length > 0 ? uploadedFilePaths : undefined,
          };
          break;

        case 'stk':
        case 'ek':
        case 'vignette':
          formData = {
            type: 'vehicleDocument',
            documentType: documentType === 'vignette' ? 'vignette' : documentType as DocumentType,
            assetId: selectedVehicleId!,
            validFrom: formatDate(validFrom),
            validTo: formatDate(validTo),
            documentNumber: documentNumber.trim() || undefined,
            price: price ? parseFloat(price) : undefined,
            country: documentType === 'vignette' ? country : undefined,
            notes: notes.trim() || undefined,
            filePaths: uploadedFilePaths.length > 0 ? uploadedFilePaths : undefined,
          };
          break;

        case 'service':
          formData = {
            type: 'serviceRecord',
            assetId: selectedVehicleId!,
            serviceDate: formatDate(serviceDate),
            serviceType,
            serviceProvider: serviceProvider.trim() || undefined,
            kmState: kmState ? parseInt(kmState, 10) : undefined,
            price: price ? parseFloat(price) : undefined,
            description: description.trim() || undefined,
            notes: notes.trim() || undefined,
            filePaths: uploadedFilePaths.length > 0 ? uploadedFilePaths : undefined,
          };
          break;

        case 'fine':
          formData = {
            type: 'fine',
            assetId: selectedVehicleId || undefined,
            fineDate: formatDate(fineDate),
            fineAmount: parseFloat(fineAmount),
            enforcementCompany: enforcementCompany.trim() || undefined,
            isPaid,
            description: description.trim() || undefined,
            filePaths: uploadedFilePaths.length > 0 ? uploadedFilePaths : undefined,
          };
          break;

        default:
          throw new Error('Unknown document type');
      }

      const editId = editData ? (editData as { id: string }).id : undefined;
      await onSave(formData, editId);
      onClose();
    } catch (error) {
      Alert.alert('Chyba', error instanceof Error ? error.message : 'Nepodarilo sa uložiť');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(null);
    }
    
    if (selectedDate) {
      switch (showDatePicker) {
        case 'validFrom':
          setValidFrom(selectedDate);
          break;
        case 'validTo':
          setValidTo(selectedDate);
          break;
        case 'serviceDate':
          setServiceDate(selectedDate);
          break;
        case 'fineDate':
          setFineDate(selectedDate);
          break;
      }
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker(null);
  };

  // ============================================
  // RENDER FORM FIELDS
  // ============================================

  const renderVehiclePicker = (isRequired: boolean = false) => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Vozidlo {isRequired ? '*' : '(voliteľné)'}
      </Text>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowVehiclePicker(true);
        }}
        style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
      >
        <Car size={18} color={colors.textSecondary} />
        <Text style={[styles.pickerText, { color: selectedVehicleId ? colors.text : colors.textMuted }]}>
          {selectedVehicleId ? getSelectedVehicleName() : 'Vyberte vozidlo'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );

  const renderInsuranceForm = () => (
    <>
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Typ poistky *
        </Text>
        <SegmentControl
          options={insuranceTypeOptions}
          value={insuranceType}
          onChange={setInsuranceType}
          size="sm"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Číslo poistky *
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
          <FileText size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Napr. 12345678"
            placeholderTextColor={colors.textMuted}
            value={policyNumber}
            onChangeText={setPolicyNumber}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Poisťovňa *
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowInsurerPicker(true);
          }}
          style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
        >
          <Building size={18} color={colors.textSecondary} />
          <Text style={[styles.pickerText, { color: company ? colors.text : colors.textMuted }]}>
            {company || 'Vyberte poisťovňu'}
          </Text>
          <ChevronDown size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Frekvencia platby
        </Text>
        <SegmentControl
          options={paymentFrequencyOptions}
          value={paymentFrequency}
          onChange={setPaymentFrequency}
          size="sm"
        />
      </View>

      {renderVehiclePicker(false)}
      {renderDateFields('Platnosť od', 'validFrom', validFrom)}
      {renderDateFields('Platnosť do (automaticky)', 'validTo', validTo)}
      {renderPriceField('Cena *')}
      {renderFileUploadSection()}
    </>
  );

  const renderFileUploadSection = () => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Dokumenty
      </Text>
      <Pressable
        onPress={handlePickDocument}
        style={[styles.uploadButton, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
      >
        <Paperclip size={18} color={colors.primary} />
        <Text style={[styles.uploadButtonText, { color: colors.primary }]}>
          Pridať dokument
        </Text>
      </Pressable>
      
      {selectedFiles.length > 0 && (
        <View style={styles.filesList}>
          {selectedFiles.map((file, index) => (
            <View
              key={index}
              style={[styles.fileItem, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
            >
              <File size={16} color={colors.textSecondary} />
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                {file.name}
              </Text>
              <Pressable onPress={() => handleRemoveFile(index)} style={styles.removeFileButton}>
                <Trash2 size={16} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderVehicleDocumentForm = () => (
    <>
      {renderVehiclePicker(true)}

      {documentType === 'vignette' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Krajina
          </Text>
          <SegmentControl
            options={vignetteCountryOptions}
            value={country}
            onChange={setCountry}
            size="sm"
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Cislo dokumentu
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
          <FileText size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Volitelne"
            placeholderTextColor={colors.textMuted}
            value={documentNumber}
            onChangeText={setDocumentNumber}
          />
        </View>
      </View>

      {renderDateFields('Platnost od', 'validFrom', validFrom)}
      {renderDateFields('Platnost do *', 'validTo', validTo)}
      {renderPriceField('Cena')}
    </>
  );

  const renderServiceForm = () => (
    <>
      {renderVehiclePicker(true)}

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Typ servisu
        </Text>
        <SegmentControl
          options={serviceTypeOptions}
          value={serviceType}
          onChange={setServiceType}
          size="sm"
        />
      </View>

      {renderDateFields('Datum servisu *', 'serviceDate', serviceDate)}

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Servisna firma
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
          <Building size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Napr. AutoServis s.r.o."
            placeholderTextColor={colors.textMuted}
            value={serviceProvider}
            onChangeText={setServiceProvider}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Stav km
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
          <Car size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Napr. 150000"
            placeholderTextColor={colors.textMuted}
            value={kmState}
            onChangeText={setKmState}
            keyboardType="numeric"
          />
        </View>
      </View>

      {renderPriceField('Cena')}

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Popis prac
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surfacePressed,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Popis vykonanych prac..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </>
  );

  const renderFineForm = () => (
    <>
      {renderVehiclePicker(false)}

      {renderDateFields('Datum pokuty *', 'fineDate', fineDate)}

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Suma pokuty *
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
          <Euro size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={fineAmount}
            onChangeText={setFineAmount}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.currency, { color: colors.textSecondary }]}>EUR</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Vymahacia firma
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
          <Building size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Volitelne"
            placeholderTextColor={colors.textMuted}
            value={enforcementCompany}
            onChangeText={setEnforcementCompany}
          />
        </View>
      </View>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsPaid(!isPaid);
        }}
        style={[
          styles.checkboxRow,
          {
            backgroundColor: isPaid ? colors.primaryLight : colors.surfacePressed,
            borderColor: isPaid ? colors.primary : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isPaid ? colors.primary : 'transparent',
              borderColor: isPaid ? colors.primary : colors.border,
            },
          ]}
        >
          {isPaid && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.checkboxLabel, { color: colors.text }]}>
          Pokuta je zaplatena
        </Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Popis
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surfacePressed,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Dovod pokuty..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </>
  );

  const renderDateFields = (label: string, field: 'validFrom' | 'validTo' | 'serviceDate' | 'fineDate', value: Date) => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Pressable
        onPress={() => setShowDatePicker(field)}
        style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
      >
        <Calendar size={18} color={colors.textSecondary} />
        <Text style={[styles.dateText, { color: colors.text }]}>
          {value.toLocaleDateString('sk-SK')}
        </Text>
      </Pressable>
    </View>
  );

  const renderPriceField = (label: string) => (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
        <Euro size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <Text style={[styles.currency, { color: colors.textSecondary }]}>EUR</Text>
      </View>
    </View>
  );

  const renderFormContent = () => {
    switch (documentType) {
      case 'insurance':
        return renderInsuranceForm();
      case 'stk':
      case 'ek':
      case 'vignette':
        return renderVehicleDocumentForm();
      case 'service':
        return renderServiceForm();
      case 'fine':
        return renderFineForm();
      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: 'rgba(0,0,0,0.5)', opacity },
        ]}
      >
        <Pressable style={styles.backdropPress} onPress={handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadowColor,
            },
            { transform: [{ translateY }], opacity },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isEditMode ? 'Upraviť' : 'Pridať'} {getDocumentTypeLabel(documentType).toLowerCase()}
            </Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Form Content */}
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderFormContent()}

            {/* Notes field (common for insurance and vehicle docs) */}
            {(documentType === 'insurance' || documentType === 'stk' || documentType === 'ek' || documentType === 'vignette') && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Poznamky
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surfacePressed,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Doplnujuce poznamky..."
                  placeholderTextColor={colors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border },
            ]}
          >
            <Button
              variant="outline"
              onPress={handleClose}
              style={styles.cancelButton}
            >
              Zrušiť
            </Button>
            <Button
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              style={styles.saveButton}
            >
              {isEditMode ? 'Uložiť zmeny' : 'Uložiť'}
            </Button>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && (
        <View style={styles.datePickerOverlay}>
          <Pressable style={styles.datePickerBackdrop} onPress={closeDatePicker} />
          <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                Vyberte dátum
              </Text>
              <Pressable onPress={closeDatePicker}>
                <Text style={[styles.datePickerDone, { color: colors.primary }]}>Hotovo</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={
                showDatePicker === 'validFrom' ? validFrom :
                showDatePicker === 'validTo' ? validTo :
                showDatePicker === 'serviceDate' ? serviceDate :
                fineDate
              }
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              style={styles.datePicker}
            />
          </View>
        </View>
      )}

      {/* Insurer Picker Modal */}
      <Modal
        visible={showInsurerPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInsurerPicker(false)}
      >
        <View style={[styles.insurerModal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.insurerModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.insurerModalTitle, { color: colors.text }]}>
              {showAddInsurer ? 'Pridať poisťovňu' : 'Vyberte poisťovňu'}
            </Text>
            <Pressable
              onPress={() => {
                setShowInsurerPicker(false);
                setShowAddInsurer(false);
                setInsurerSearchQuery('');
              }}
              style={styles.insurerModalClose}
            >
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {showAddInsurer ? (
            /* Add new insurer form */
            <View style={styles.addInsurerForm}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Názov poisťovne
              </Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
                <Building size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Zadajte názov poisťovne"
                  placeholderTextColor={colors.textMuted}
                  value={newInsurerName}
                  onChangeText={setNewInsurerName}
                  autoFocus
                />
              </View>
              <View style={styles.addInsurerButtons}>
                <Button
                  variant="outline"
                  onPress={() => {
                    setShowAddInsurer(false);
                    setNewInsurerName('');
                  }}
                  style={{ flex: 1 }}
                >
                  Zrušiť
                </Button>
                <Button
                  onPress={handleAddInsurer}
                  loading={isAddingInsurer}
                  disabled={isAddingInsurer || !newInsurerName.trim()}
                  style={{ flex: 2 }}
                >
                  Pridať
                </Button>
              </View>
            </View>
          ) : (
            /* Insurer list */
            <>
              {/* Search input */}
              <View style={[styles.insurerSearchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={[styles.insurerSearchInput, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
                  <Search size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Hľadať poisťovňu..."
                    placeholderTextColor={colors.textMuted}
                    value={insurerSearchQuery}
                    onChangeText={setInsurerSearchQuery}
                  />
                </View>
              </View>

              {/* Add new button */}
              <TouchableOpacity
                onPress={() => {
                  setShowAddInsurer(true);
                  setNewInsurerName(insurerSearchQuery);
                }}
                style={[styles.addInsurerButton, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
              >
                <View style={[styles.addInsurerIcon, { backgroundColor: colors.primaryLight }]}>
                  <Plus size={20} color={colors.primary} />
                </View>
                <Text style={[styles.addInsurerText, { color: colors.primary }]}>
                  Pridať novú poisťovňu
                </Text>
              </TouchableOpacity>

              {/* Insurers list */}
              <FlatList
                data={getFilteredInsurers()}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.insurerListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectInsurer(item)}
                    style={[
                      styles.insurerItem,
                      { 
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                      },
                      selectedInsurerId === item.id && { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Building size={20} color={selectedInsurerId === item.id ? colors.primary : colors.textSecondary} />
                    <Text style={[
                      styles.insurerItemText,
                      { color: selectedInsurerId === item.id ? colors.primary : colors.text },
                    ]}>
                      {item.name}
                    </Text>
                    {selectedInsurerId === item.id && (
                      <Text style={[styles.selectedCheck, { color: colors.primary }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyInsurers}>
                    <Text style={[styles.emptyInsurersText, { color: colors.textSecondary }]}>
                      Žiadne poisťovne nenájdené
                    </Text>
                  </View>
                }
              />
            </>
          )}
        </View>
      </Modal>

      {/* Vehicle Picker Modal */}
      <Modal
        visible={showVehiclePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVehiclePicker(false)}
      >
        <View style={[styles.insurerModal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.insurerModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.insurerModalTitle, { color: colors.text }]}>
              Vyberte vozidlo
            </Text>
            <Pressable
              onPress={() => {
                setShowVehiclePicker(false);
                setVehicleSearchQuery('');
              }}
              style={styles.insurerModalClose}
            >
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Search input */}
          <View style={[styles.insurerSearchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={[styles.insurerSearchInput, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Hľadať vozidlo..."
                placeholderTextColor={colors.textMuted}
                value={vehicleSearchQuery}
                onChangeText={setVehicleSearchQuery}
              />
            </View>
          </View>

          {/* Vehicles list */}
          <FlatList
            data={getFilteredVehicles()}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.insurerListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectVehicle(item)}
                style={[
                  styles.insurerItem,
                  { 
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                  },
                  selectedVehicleId === item.id && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Car size={20} color={selectedVehicleId === item.id ? colors.primary : colors.textSecondary} />
                <View style={styles.vehicleItemContent}>
                  <Text style={[
                    styles.insurerItemText,
                    { color: selectedVehicleId === item.id ? colors.primary : colors.text },
                  ]}>
                    {item.name}
                  </Text>
                  {(item.licensePlate || item.make || item.model) && (
                    <Text style={[styles.vehicleItemSubtext, { color: colors.textSecondary }]}>
                      {[item.licensePlate, item.make, item.model].filter(Boolean).join(' • ')}
                    </Text>
                  )}
                </View>
                {selectedVehicleId === item.id && (
                  <Text style={[styles.selectedCheck, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyInsurers}>
                <Car size={48} color={colors.textMuted} />
                <Text style={[styles.emptyInsurersText, { color: colors.textSecondary, marginTop: 12 }]}>
                  {vehicleSearchQuery 
                    ? 'Žiadne vozidlá nezodpovedajú vyhľadávaniu' 
                    : 'Zatiaľ nemáte žiadne vozidlá'}
                </Text>
                <Text style={[styles.emptyInsurersSubtext, { color: colors.textMuted }]}>
                  Pridajte vozidlo v sekcii Vozidlá
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPress: {
    flex: 1,
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    maxHeight: 450,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  currency: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    flex: 1,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
pickerText: {
    flex: 1,
    fontSize: 15,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 14,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filesList: {
    marginTop: 12,
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
  },
  removeFileButton: {
    padding: 4,
  },
  insurerModal: {
    flex: 1,
  },
  insurerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  insurerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  insurerModalClose: {
    padding: 4,
  },
  insurerSearchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  insurerSearchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  addInsurerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  addInsurerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addInsurerText: {
    fontSize: 15,
    fontWeight: '500',
  },
  insurerListContent: {
    paddingBottom: 40,
  },
  insurerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  insurerItemText: {
    flex: 1,
    fontSize: 15,
  },
  selectedCheck: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyInsurers: {
    padding: 40,
    alignItems: 'center',
  },
  emptyInsurersText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyInsurersSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  vehicleItemContent: {
    flex: 1,
  },
  vehicleItemSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  addInsurerForm: {
    padding: 20,
    gap: 16,
  },
  addInsurerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1001,
  },
  datePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  datePickerDone: {
    fontSize: 17,
    fontWeight: '600',
  },
  datePicker: {
    height: 200,
  },
});

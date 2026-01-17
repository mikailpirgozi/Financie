import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { FUEL_TYPES } from '@finapp/core';

import { useTheme } from '@/contexts/ThemeContext';
import { createVehicle, getCurrentHousehold, getVehicles, type CreateVehicleData } from '@/lib/api';
import { VehicleMakeSelect, VehicleModelSelect, CompanySelect } from '@/components/vehicles';

export default function NewVehicleScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState<string[]>([]);
  const [shouldAutoOpenModel, setShouldAutoOpenModel] = useState(false);

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    description: '',
    year: '',
    licensePlate: '',
    vin: '',
    registeredCompany: '',
    acquisitionValue: '',
    currentValue: '',
    acquisitionDate: null as Date | null,
    fuelType: '',
    mileage: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const household = await getCurrentHousehold();
      setHouseholdId(household.id);
      
      // Load existing companies from vehicles
      const vehiclesResponse = await getVehicles(household.id);
      if (vehiclesResponse.filters?.companies) {
        setExistingCompanies(vehiclesResponse.filters.companies);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const handleMakeChange = useCallback((make: string) => {
    setFormData(prev => ({ ...prev, make, model: '' }));
    setShouldAutoOpenModel(true);
  }, []);

  const handleModelChange = useCallback((model: string) => {
    setFormData(prev => ({ ...prev, model }));
    setShouldAutoOpenModel(false);
  }, []);

  const handleSubmit = async () => {
    if (!householdId) {
      Alert.alert('Chyba', 'Nepodarilo sa načítať domácnosť');
      return;
    }

    if (!formData.make.trim()) {
      Alert.alert('Chyba', 'Značka vozidla je povinná');
      return;
    }

    const acquisitionValue = parseFloat(formData.acquisitionValue);
    const currentValue = parseFloat(formData.currentValue);

    if (isNaN(acquisitionValue) || acquisitionValue <= 0) {
      Alert.alert('Chyba', 'Nákupná cena musí byť kladné číslo');
      return;
    }

    if (isNaN(currentValue) || currentValue <= 0) {
      Alert.alert('Chyba', 'Aktuálna hodnota musí byť kladné číslo');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate name from make + model if description is empty
      const vehicleName = formData.description.trim() || 
        `${formData.make}${formData.model ? ' ' + formData.model : ''}`;

      const data: CreateVehicleData = {
        householdId,
        name: vehicleName,
        acquisitionValue,
        currentValue,
        acquisitionDate: formData.acquisitionDate 
          ? formData.acquisitionDate.toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0],
        make: formData.make.trim(),
        model: formData.model.trim() || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        licensePlate: formData.licensePlate.trim() || undefined,
        vin: formData.vin.trim() || undefined,
        registeredCompany: formData.registeredCompany.trim() || undefined,
        fuelType: formData.fuelType || undefined,
        mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
      };

      const result = await createVehicle(data);
      router.replace(`/(tabs)/vehicles/${result.data.id}`);
    } catch (err) {
      Alert.alert('Chyba', err instanceof Error ? err.message : 'Nepodarilo sa vytvoriť vozidlo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Nové vozidlo</Text>
        <TouchableOpacity 
          onPress={handleSubmit} 
          style={styles.saveButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>Uložiť</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Vehicle Selection */}
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Vozidlo</Text>
            
            <VehicleMakeSelect
              value={formData.make}
              onChange={handleMakeChange}
            />

            <VehicleModelSelect
              make={formData.make}
              value={formData.model}
              onChange={handleModelChange}
              autoOpen={shouldAutoOpenModel}
            />

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Doplnkový popis
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="napr. Firemné auto, Otcovo auto..."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Rok výroby</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={formData.year}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, year: text.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="napr. 2020"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={4}
                />
              </View>
              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Palivo</Text>
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <Picker
                    selectedValue={formData.fuelType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, fuelType: value }))}
                    style={{ color: theme.colors.text }}
                  >
                    <Picker.Item label="Vyberte..." value="" />
                    {FUEL_TYPES.map(fuel => (
                      <Picker.Item key={fuel.value} label={fuel.label} value={fuel.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {/* Financials */}
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Financie</Text>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nákupná cena (€) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={formData.acquisitionValue}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, acquisitionValue: text.replace(/[^0-9.,]/g, '') }))}
                  keyboardType="numeric"
                  placeholder="napr. 25000"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Aktuálna hodnota (€) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={formData.currentValue}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, currentValue: text.replace(/[^0-9.,]/g, '') }))}
                  keyboardType="numeric"
                  placeholder="napr. 20000"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Dátum nákupu</Text>
              <TouchableOpacity 
                style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: formData.acquisitionDate ? theme.colors.text : theme.colors.textSecondary }}>
                  {formData.acquisitionDate 
                    ? formData.acquisitionDate.toLocaleDateString('sk-SK')
                    : 'Nepovinné'
                  }
                </Text>
              </TouchableOpacity>
              {formData.acquisitionDate && (
                <TouchableOpacity 
                  style={styles.clearDate}
                  onPress={() => setFormData(prev => ({ ...prev, acquisitionDate: null }))}
                >
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    Zrušiť dátum
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData.acquisitionDate || new Date()}
                mode="date"
                display="default"
                onChange={(_event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setFormData(prev => ({ ...prev, acquisitionDate: date }));
                  }
                }}
              />
            )}
          </View>

          {/* Identification */}
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Identifikácia</Text>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>ŠPZ</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={formData.licensePlate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, licensePlate: text.toUpperCase() }))}
                  placeholder="napr. BA 123 AB"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="characters"
                />
              </View>
              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Najazdené km</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={formData.mileage}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, mileage: text.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="napr. 85000"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>VIN</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={formData.vin}
                onChangeText={(text) => setFormData(prev => ({ ...prev, vin: text.toUpperCase() }))}
                placeholder="17-miestny kód"
                placeholderTextColor={theme.colors.textSecondary}
                maxLength={17}
                autoCapitalize="characters"
              />
            </View>

            <CompanySelect
              value={formData.registeredCompany}
              onChange={(company) => setFormData(prev => ({ ...prev, registeredCompany: company }))}
              existingCompanies={existingCompanies}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  saveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    width: '100%',
  },
  pickerContainer: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
  },
  clearDate: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
});

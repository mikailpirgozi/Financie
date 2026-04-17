import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
// expo-file-system v55+ moved string/base64 helpers to the legacy entrypoint.
import * as FileSystem from 'expo-file-system/legacy';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import type { ReceiptParseResult } from '@finapp/core';

interface OcrResponse {
  provider: string;
  parsed: ReceiptParseResult;
  rawText: string;
}

export default function ScanReceiptScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OcrResponse | null>(null);

  async function pickImage(source: 'camera' | 'library') {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Povolenia', 'Bez prístupu ku kamere/galérii nemôžeme načítať bloček.');
      return;
    }

    const picker =
      source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;

    const res = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });
    if (res.canceled || res.assets.length === 0) return;
    setImageUri(res.assets[0].uri);
    setResult(null);
  }

  async function runOcr() {
    if (!imageUri) return;
    setBusy(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime = imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const data = await apiFetch<OcrResponse>('/api/ocr/receipt', {
        method: 'POST',
        body: JSON.stringify({ base64, mimeType: mime }),
      });
      setResult(data);
    } catch (err) {
      Alert.alert('OCR zlyhalo', err instanceof Error ? err.message : 'Skúste znova.');
    } finally {
      setBusy(false);
    }
  }

  function applyToNewExpense() {
    if (!result) return;
    const { merchant, date, total } = result.parsed;
    router.push({
      pathname: '/(tabs)/expenses/new',
      params: {
        prefillMerchant: merchant ?? '',
        prefillDate: date ?? '',
        prefillAmount: total ? String(total) : '',
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Naskenovať bloček</Text>
      <Text style={styles.help}>
        Odfoťte bloček alebo vyberte fotku. Aplikácia rozpozná predajcu, dátum a celkovú sumu.
      </Text>

      <View style={styles.row}>
        <Button onPress={() => pickImage('camera')} variant="primary">
          Odfotiť
        </Button>
        <Button onPress={() => pickImage('library')} variant="secondary">
          Z galérie
        </Button>
      </View>

      {imageUri ? (
        <View style={styles.preview}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          <Button onPress={runOcr} disabled={busy}>
            Spustiť OCR
          </Button>
        </View>
      ) : null}

      {busy ? <ActivityIndicator size="large" style={styles.spinner} /> : null}

      {result ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Rozpoznané údaje</Text>
          <Text style={styles.field}>Predajca: {result.parsed.merchant ?? '—'}</Text>
          <Text style={styles.field}>Dátum: {result.parsed.date ?? '—'}</Text>
          <Text style={styles.field}>
            Suma: {result.parsed.total ? `${result.parsed.total.toFixed(2)} EUR` : '—'}
          </Text>
          <Text style={styles.confidence}>
            Spoľahlivosť: {(result.parsed.confidence * 100).toFixed(0)} %
          </Text>
          <Button onPress={applyToNewExpense}>Vytvoriť výdavok z týchto údajov</Button>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  help: { color: '#555', lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12 },
  preview: { gap: 12 },
  image: { width: '100%', height: 320, borderRadius: 8, backgroundColor: '#f5f5f5' },
  spinner: { marginVertical: 24 },
  resultCard: {
    backgroundColor: '#f7f9fc',
    padding: 16,
    borderRadius: 12,
    gap: 6,
  },
  resultTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  field: { fontSize: 15 },
  confidence: { color: '#666', marginBottom: 8 },
});

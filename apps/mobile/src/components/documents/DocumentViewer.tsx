import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X, ChevronLeft, ChevronRight, ExternalLink, FileText, File } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DocumentViewerProps {
  visible: boolean;
  files: string[];
  onClose: () => void;
  title?: string;
}

const isImageFile = (uri: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const lowerUri = uri.toLowerCase();
  return imageExtensions.some(ext => lowerUri.includes(ext)) || 
         lowerUri.includes('image/') ||
         (lowerUri.startsWith('file://') && imageExtensions.some(ext => lowerUri.endsWith(ext)));
};

const isPdfFile = (uri: string): boolean => {
  return uri.toLowerCase().includes('.pdf') || uri.toLowerCase().includes('application/pdf');
};

const getFileName = (uri: string, index: number): string => {
  try {
    const parts = uri.split('/');
    const fileName = parts[parts.length - 1];
    if (fileName && fileName.length > 0) {
      return decodeURIComponent(fileName);
    }
  } catch {
    // Ignore
  }
  return `Dokument ${index + 1}`;
};

export function DocumentViewer({
  visible,
  files,
  onClose,
  title = 'Dokumenty',
}: DocumentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  const _opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(_opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setCurrentIndex(0);
      setIsLoading(true);
      setLoadError(false);
    } else {
      Animated.timing(_opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(currentIndex - 1);
      setIsLoading(true);
      setLoadError(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex(currentIndex + 1);
      setIsLoading(true);
      setLoadError(false);
    }
  };

  const handleOpenExternal = async () => {
    const currentFile = files[currentIndex];
    try {
      const canOpen = await Linking.canOpenURL(currentFile);
      if (canOpen) {
        await Linking.openURL(currentFile);
      } else {
        Alert.alert('Chyba', 'Nepodarilo sa otvoriť dokument');
      }
    } catch (error) {
      Alert.alert('Chyba', 'Nepodarilo sa otvoriť dokument');
    }
  };

  const currentFile = files[currentIndex];
  const isImage = currentFile ? isImageFile(currentFile) : false;
  const isPdf = currentFile ? isPdfFile(currentFile) : false;

  if (!visible || files.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.95)' }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{title}</Text>
            {files.length > 1 && (
              <Text style={styles.headerCount}>
                {currentIndex + 1} / {files.length}
              </Text>
            )}
          </View>
          <Pressable onPress={handleOpenExternal} style={styles.actionButton}>
            <ExternalLink size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isImage ? (
            <View style={styles.imageContainer}>
              {isLoading && (
                <ActivityIndicator size="large" color="#fff" style={styles.loader} />
              )}
              {loadError ? (
                <View style={styles.errorContainer}>
                  <FileText size={48} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.errorText}>
                    Nepodarilo sa načítať obrázok
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: currentFile }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setLoadError(true);
                  }}
                />
              )}
            </View>
          ) : isPdf ? (
            <View style={styles.pdfWebViewContainer}>
              {isLoading && (
                <View style={styles.pdfLoaderOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.pdfLoadingText}>Načítavam PDF...</Text>
                </View>
              )}
              <WebView
                source={{ uri: currentFile }}
                style={styles.pdfWebView}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setLoadError(true);
                }}
                startInLoadingState={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scalesPageToFit={true}
                originWhitelist={['*']}
                allowFileAccess={true}
                allowFileAccessFromFileURLs={true}
                allowUniversalAccessFromFileURLs={true}
              />
              {loadError && (
                <View style={styles.pdfErrorOverlay}>
                  <FileText size={48} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.errorText}>Nepodarilo sa načítať PDF</Text>
                  <Pressable onPress={handleOpenExternal} style={styles.openButton}>
                    <ExternalLink size={18} color="#fff" />
                    <Text style={styles.openButtonText}>Otvoriť externe</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.unknownContainer}>
              <File size={64} color="rgba(255,255,255,0.5)" />
              <Text style={styles.unknownText}>
                {getFileName(currentFile, currentIndex)}
              </Text>
              <Pressable
                onPress={handleOpenExternal}
                style={styles.openButton}
              >
                <ExternalLink size={18} color="#fff" />
                <Text style={styles.openButtonText}>Otvoriť</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Navigation */}
        {files.length > 1 && (
          <View style={styles.navigation}>
            <Pressable
              onPress={handlePrevious}
              disabled={currentIndex === 0}
              style={[
                styles.navButton,
                currentIndex === 0 && styles.navButtonDisabled,
              ]}
            >
              <ChevronLeft size={28} color={currentIndex === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </Pressable>
            
            {/* Dots indicator */}
            <View style={styles.dotsContainer}>
              {files.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
            
            <Pressable
              onPress={handleNext}
              disabled={currentIndex === files.length - 1}
              style={[
                styles.navButton,
                currentIndex === files.length - 1 && styles.navButtonDisabled,
              ]}
            >
              <ChevronRight size={28} color={currentIndex === files.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </Pressable>
          </View>
        )}

        {/* File info */}
        <View style={styles.fileInfo}>
          <Text style={styles.fileInfoText}>
            {getFileName(currentFile, currentIndex)}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  headerCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  loader: {
    position: 'absolute',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
  },
  pdfWebViewContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1a1a1a',
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pdfLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  pdfLoadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 12,
  },
  pdfErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    gap: 16,
  },
  pdfContainer: {
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  pdfText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pdfFileName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: SCREEN_WIDTH - 80,
  },
  unknownContainer: {
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  unknownText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: SCREEN_WIDTH - 80,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  fileInfo: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    alignItems: 'center',
  },
  fileInfoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },
});

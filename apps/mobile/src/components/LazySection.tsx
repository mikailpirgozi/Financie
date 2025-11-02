import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

/**
 * 🚀 LAZY LOADING COMPONENT
 * 
 * Renderuje children až keď sú viditeľné na obrazovke (intersection observer pattern)
 * 
 * Použitie:
 * ```tsx
 * <LazySection>
 *   <HeavyComponent />
 * </LazySection>
 * ```
 * 
 * Výhody:
 * - Rýchlejší initial render
 * - Menej pamäte
 * - Lepší UX (render len čo užívateľ vidí)
 */

interface LazySectionProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  delay?: number; // Delay before rendering (ms)
  threshold?: number; // Scroll threshold (0-1)
  style?: ViewStyle;
  enabled?: boolean; // Enable/disable lazy loading
}

export function LazySection({
  children,
  placeholder = null,
  delay = 100,
  threshold = 0.1,
  style,
  enabled = true,
}: LazySectionProps) {
  const [shouldRender, setShouldRender] = useState(!enabled);
  const hasRendered = useRef(false);

  useEffect(() => {
    if (!enabled || hasRendered.current) {
      return;
    }

    // Simulácia intersection observer - v React Native nemáme priamy ekvivalent
    // Používame timeout pre progressive rendering
    const timer = setTimeout(() => {
      setShouldRender(true);
      hasRendered.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, delay]);

  if (!shouldRender) {
    return placeholder ? <View style={style}>{placeholder}</View> : null;
  }

  return <View style={style}>{children}</View>;
}

/**
 * Lazy section pre charts (stredná priorita)
 */
export function LazyChartSection({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <LazySection delay={200} style={style} placeholder={<ChartPlaceholder />}>
      {children}
    </LazySection>
  );
}

/**
 * Lazy section pre history table (nízka priorita)
 */
export function LazyHistorySection({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <LazySection delay={400} style={style} placeholder={<HistoryPlaceholder />}>
      {children}
    </LazySection>
  );
}

/**
 * Placeholder pre chart (mini skeleton)
 */
function ChartPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <View style={styles.placeholderBar} />
    </View>
  );
}

/**
 * Placeholder pre history (mini skeleton)
 */
function HistoryPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <View style={[styles.placeholderBar, { height: 60 }]} />
      <View style={[styles.placeholderBar, { height: 60, marginTop: 8 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  placeholderBar: {
    backgroundColor: '#e0e0e0',
    height: 200,
    borderRadius: 8,
  },
});

/**
 * Hook: Progressive rendering - renderuje komponenty postupne
 * 
 * Použitie:
 * ```tsx
 * const { shouldRender } = useProgressiveRender(['kpi', 'charts', 'history']);
 * 
 * return (
 *   <>
 *     <KPICards />
 *     {shouldRender('charts') && <Charts />}
 *     {shouldRender('history') && <HistoryTable />}
 *   </>
 * );
 * ```
 */
export function useProgressiveRender(sections: string[], intervalMs: number = 150) {
  const [renderedSections, setRenderedSections] = useState<Set<string>>(new Set([sections[0]]));

  useEffect(() => {
    let currentIndex = 1;

    const timer = setInterval(() => {
      if (currentIndex >= sections.length) {
        clearInterval(timer);
        return;
      }

      setRenderedSections((prev) => new Set([...prev, sections[currentIndex]]));
      currentIndex++;
    }, intervalMs);

    return () => clearInterval(timer);
  }, [sections, intervalMs]);

  return {
    shouldRender: (section: string) => renderedSections.has(section),
    renderedCount: renderedSections.size,
    totalCount: sections.length,
    isComplete: renderedSections.size === sections.length,
  };
}


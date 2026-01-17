import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  Bell,
  Globe,
  Crown,
  Fingerprint,
  RefreshCw,
  Info,
  HelpCircle,
  Shield,
  LogOut,
  ChevronRight,
  Briefcase,
  CreditCard,
  Home,
  Tag,
  BarChart3,
  Users,
  Sun,
  Moon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/Toast';
import { useBiometricAuth } from '@/hooks';
import { useTheme } from '../../src/contexts';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
}

function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  rightContent,
  showChevron = true,
}: MenuItemProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.menuItem,
          { borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryLight }]}>
          {icon}
        </View>
        <View style={styles.menuContent}>
          <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
          {sublabel && (
            <Text style={[styles.menuSublabel, { color: colors.textMuted }]}>
              {sublabel}
            </Text>
          )}
        </View>
        {rightContent}
        {showChevron && !rightContent && (
          <ChevronRight size={20} color={colors.textMuted} />
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const colors = theme.colors;
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    getBiometricTypeName,
    disableBiometric,
  } = useBiometricAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nie ste prihlaseny');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: profileData?.display_name || null,
        avatar_url: profileData?.avatar_url || null,
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa nacitat profil',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const handleClearCache = () => {
    Alert.alert(
      'Vycistit cache',
      'Toto vymaze vsetky nacitane data a znova ich nacita zo servera.',
      [
        { text: 'Zrusit', style: 'cancel' },
        {
          text: 'Vycistit',
          style: 'destructive',
          onPress: async () => {
            try {
              await queryClient.clear();
              showToast('Cache uspesne vymazana!', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await queryClient.refetchQueries();
            } catch (error) {
              showToast('Nepodarilo sa vymazat cache', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Odhlasit sa',
      'Naozaj sa chcete odhlasit?',
      [
        { text: 'Zrusit', style: 'cancel' },
        {
          text: 'Odhlasit',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              showToast('Boli ste uspesne odhlaseny', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              showToast('Nepodarilo sa odhlasit', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      Alert.alert(
        `Vypnut ${getBiometricTypeName()}`,
        `Naozaj chcete vypnut prihlasovanie cez ${getBiometricTypeName()}?`,
        [
          { text: 'Zrusit', style: 'cancel' },
          {
            text: 'Vypnut',
            style: 'destructive',
            onPress: async () => {
              const success = await disableBiometric();
              if (success) {
                showToast(`${getBiometricTypeName()} bolo vypnute`, 'success');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                showToast(`Nepodarilo sa vypnut ${getBiometricTypeName()}`, 'error');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        `Aktivovat ${getBiometricTypeName()}`,
        `Pre aktivaciu ${getBiometricTypeName()} sa prosim odhlaste a pri dalsom prihlaseni vam bude ponuknuta moznost aktivacie.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleThemeChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Cycle through: system -> light -> dark -> system
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Svetly';
      case 'dark':
        return 'Tmavy';
      default:
        return 'Systemovy';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer]}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Nacitavam...
          </Text>
        </View>
      </View>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || '??';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Profile Card */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadowColor,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {initials}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>
              {profile?.full_name || 'Pouzivatel'}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {profile?.email}
            </Text>
          </View>

          {/* Features Section */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Dalsie funkcie
          </Text>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MenuItem
              icon={<Briefcase size={20} color={colors.primary} />}
              label="Portfolio Management"
              onPress={() => router.push('/(screens)/portfolio')}
            />
            <MenuItem
              icon={<CreditCard size={20} color={colors.primary} />}
              label="Uvery"
              onPress={() => router.push('/(tabs)/loans')}
            />
            <MenuItem
              icon={<Home size={20} color={colors.primary} />}
              label="Majetok"
              onPress={() => router.push('/(screens)/assets')}
            />
            <MenuItem
              icon={<Users size={20} color={colors.primary} />}
              label="Domacnost"
              onPress={() => router.push('/(screens)/household')}
            />
          </View>

          {/* Personal Finance Section */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Osobne financie
          </Text>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MenuItem
              icon={<CreditCard size={20} color={colors.primary} />}
              label="Vydavky"
              onPress={() => router.push('/(tabs)/expenses')}
            />
            <MenuItem
              icon={<CreditCard size={20} color={colors.primary} />}
              label="Prijmy"
              onPress={() => router.push('/(tabs)/incomes')}
            />
            <MenuItem
              icon={<Tag size={20} color={colors.primary} />}
              label="Kategorie"
              onPress={() => router.push('/(screens)/categories')}
            />
            <MenuItem
              icon={<BarChart3 size={20} color={colors.primary} />}
              label="Mesacne suhrny"
              onPress={() => router.push('/(screens)/summaries')}
            />
          </View>

          {/* Settings Section */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Nastavenia
          </Text>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MenuItem
              icon={<User size={20} color={colors.primary} />}
              label="Profil"
              onPress={() => router.push('/(tabs)/settings/profile')}
            />
            <MenuItem
              icon={<Bell size={20} color={colors.primary} />}
              label="Notifikacie"
              onPress={() => router.push('/(tabs)/settings/notifications')}
            />
            <MenuItem
              icon={<Globe size={20} color={colors.primary} />}
              label="Jazyk"
              sublabel="Slovencina"
              onPress={() => router.push('/(tabs)/settings/language')}
            />
            <MenuItem
              icon={isDark ? <Moon size={20} color={colors.primary} /> : <Sun size={20} color={colors.primary} />}
              label="Tema"
              sublabel={getThemeLabel()}
              onPress={handleThemeChange}
            />
          </View>

          {/* Subscription Section */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Predplatne
          </Text>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MenuItem
              icon={<Crown size={20} color={colors.warning} />}
              label="Upgrade na Premium"
              sublabel="Free"
              onPress={() => router.push('/(tabs)/settings/subscription')}
            />
          </View>

          {/* Security Section */}
          {biometricAvailable && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Bezpecnost
              </Text>
              <View
                style={[
                  styles.menuCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
                  <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryLight }]}>
                    <Fingerprint size={20} color={colors.primary} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={[styles.menuLabel, { color: colors.text }]}>
                      {getBiometricTypeName()}
                    </Text>
                    <Text style={[styles.menuSublabel, { color: colors.textMuted }]}>
                      Rychle prihlasenie pomocou biometrie
                    </Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                </View>
              </View>
            </>
          )}

          {/* Advanced Section */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Pokrocile
          </Text>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MenuItem
              icon={<RefreshCw size={20} color={colors.primary} />}
              label="Vycistit cache"
              onPress={handleClearCache}
            />
          </View>

          {/* Info Section */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Informacie
          </Text>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MenuItem
              icon={<Info size={20} color={colors.primary} />}
              label="O aplikacii"
              onPress={() => router.push('/(tabs)/settings/about')}
            />
            <MenuItem
              icon={<HelpCircle size={20} color={colors.primary} />}
              label="Pomoc"
              onPress={() => router.push('/(tabs)/settings/help')}
            />
            <MenuItem
              icon={<Shield size={20} color={colors.primary} />}
              label="Ochrana sukromia"
              onPress={() => router.push('/(tabs)/settings/privacy')}
            />
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: colors.dangerLight, borderColor: colors.danger },
            ]}
            onPress={handleLogout}
          >
            <LogOut size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>
              Odhlasit sa
            </Text>
          </TouchableOpacity>

          {/* Version */}
          <View style={styles.versionSection}>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>
              Verzia 1.0.0
            </Text>
            <Text style={[styles.versionSubtext, { color: colors.textMuted }]}>
              © 2024 Financie App
            </Text>
          </View>
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  versionSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 11,
  },
});

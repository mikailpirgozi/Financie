import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentHousehold } from '../../src/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

interface Household {
  id: string;
  name: string;
  created_at: string;
}

interface HouseholdMember {
  id: string;
  user_id: string;
  household_id: string;
  role: string;
  joined_at: string;
  user: {
    email: string;
    full_name: string | null;
  };
}

export default function HouseholdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadHousehold();
  }, []);

  const loadHousehold = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      setCurrentHousehold(household);

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select(`
          *,
          profiles(display_name, email, id)
        `)
        .eq('household_id', household.id);

      if (membersError) throw membersError;
      
      // Transform data to match expected format
      interface MemberData {
        id: string;
        user_id: string;
        household_id: string;
        role: string;
        joined_at: string;
        profiles?: {
          email?: string;
          display_name?: string;
        };
      }
      const transformedMembers = (membersData || []).map((member: MemberData): HouseholdMember => ({
        id: member.id,
        user_id: member.user_id,
        household_id: member.household_id,
        role: member.role,
        joined_at: member.joined_at,
        user: {
          email: member.profiles?.email || '',
          full_name: member.profiles?.display_name || null,
        }
      }));
      setMembers(transformedMembers);

      // Load all households user belongs to
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userHouseholds } = await supabase
          .from('household_members')
          .select('household:households(*)')
          .eq('user_id', user.id);

        if (userHouseholds) {
          interface HouseholdMemberResponse {
            household: Household | Household[] | null;
          }
          const households = userHouseholds
            .map((h: HouseholdMemberResponse) => {
              if (Array.isArray(h.household)) {
                return h.household[0] ?? null;
              }
              return h.household;
            })
            .filter((h): h is Household => h !== null);
          setAllHouseholds(households);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať domácnosť');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchHousehold = async (householdId: string) => {
    if (householdId === currentHousehold?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/household/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ householdId }),
      });

      if (!response.ok) {
        throw new Error('Nepodarilo sa prepnúť domácnosť');
      }

      showToast('Domácnosť bola prepnutá', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reload data
      await loadHousehold();
    } catch (error) {
      showToast('Nepodarilo sa prepnúť domácnosť', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      admin: 'Administrátor',
      member: 'Člen',
      viewer: 'Pozorovateľ',
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'success' | 'warning' => {
    if (role === 'admin') return 'warning';
    if (role === 'member') return 'default';
    return 'default';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Načítavam domácnosť..." />
      </View>
    );
  }

  if (error || !currentHousehold) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyTitle}>Nemáte žiadnu domácnosť</Text>
          <Text style={styles.emptyText}>
            Domácnosť sa mala automaticky vytvoriť pri registrácii.
          </Text>
          <Text style={styles.emptyText}>
            Prosím kontaktujte podporu alebo skúste sa odhlásiť a prihlásiť znova.
          </Text>
          <Button
            onPress={loadHousehold}
            variant="primary"
            style={styles.retryButton}
          >
            Skúsiť znova
          </Button>
          {error && (
            <Text style={styles.errorDetails}>Chyba: {error}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: insets.top }}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Domácnosť</Text>
          </View>

          {/* Current Household */}
          <Card style={styles.currentCard}>
            <Text style={styles.cardTitle}>Aktuálna domácnosť</Text>
            <Text style={styles.householdName}>{currentHousehold?.name}</Text>
            <Text style={styles.memberCount}>{members.length} členov</Text>
          </Card>

          {/* Household Switcher */}
          {allHouseholds.length > 1 && (
            <>
              <Text style={styles.sectionTitle}>Prepnúť domácnosť</Text>
              <Card style={styles.menuCard}>
                {allHouseholds.map((household) => (
                  <TouchableOpacity
                    key={household.id}
                    style={styles.householdItem}
                    onPress={() => handleSwitchHousehold(household.id)}
                  >
                    <View style={styles.householdInfo}>
                      <Text style={styles.householdItemName}>{household.name}</Text>
                      {household.id === currentHousehold?.id && (
                        <Badge variant="success">Aktuálna</Badge>
                      )}
                    </View>
                    {household.id !== currentHousehold?.id && (
                      <Text style={styles.chevron}>›</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </Card>
            </>
          )}

          {/* Members */}
          <View style={styles.membersHeader}>
            <Text style={styles.sectionTitle}>Členovia</Text>
            <Button
              onPress={() => router.push('/(screens)/household/invite')}
              size="sm"
            >
              + Pozvať
            </Button>
          </View>

          <Card style={styles.menuCard}>
            {members.map((member, index) => (
              <View
                key={member.id}
                style={[
                  styles.memberItem,
                  index === members.length - 1 && styles.lastItem,
                ]}
              >
                <View style={styles.memberInfo}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.user?.full_name?.charAt(0) || member.user?.email?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>
                      {member.user?.full_name || member.user?.email}
                    </Text>
                    <Text style={styles.memberEmail}>{member.user?.email}</Text>
                  </View>
                </View>
                <Badge variant={getRoleBadgeVariant(member.role)}>
                  {getRoleLabel(member.role)}
                </Badge>
              </View>
            ))}
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              onPress={() => router.push('/(screens)/household/settings')}
              variant="outline"
              fullWidth
            >
              Nastavenia domácnosti
            </Button>
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
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  currentCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  householdName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuCard: {
    padding: 0,
    marginBottom: 24,
    overflow: 'hidden',
  },
  householdItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  householdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  householdItemName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#9ca3af',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  actions: {
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 24,
    minWidth: 200,
  },
  errorDetails: {
    marginTop: 16,
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
  },
});


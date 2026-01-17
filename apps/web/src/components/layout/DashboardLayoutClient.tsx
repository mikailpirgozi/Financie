'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import { createClient } from '@/lib/supabase/client';

interface DashboardLayoutClientProps {
  user: {
    email?: string;
    user_metadata?: {
      display_name?: string;
    };
  };
  householdId?: string;
  households?: Array<{ id: string; name: string; role: string }>;
  locale: string;
  children: React.ReactNode;
}

export function DashboardLayoutClient({ user, householdId, households, locale, children }: DashboardLayoutClientProps): React.JSX.Element {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  // Fetch overdue count for bottom nav badge
  useEffect(() => {
    if (!householdId) return;

    const fetchOverdueCount = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .rpc('count_overdue_installments', { p_household_id: householdId });
        
        if (data !== null) {
          setOverdueCount(data);
        }
      } catch {
        // Silent fail
      }
    };

    fetchOverdueCount();

    // Set up realtime subscription for loan schedule changes
    const supabase = createClient();
    const channel = supabase
      .channel('overdue-badges-web')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'loan_schedules' },
        () => {
          // Throttle updates
          fetchOverdueCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  const content = (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        households={households}
        currentHouseholdId={householdId}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} locale={locale} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      {/* Mobile Bottom Navigation */}
      <BottomNav overdueCount={overdueCount} />
    </div>
  );

  if (householdId) {
    return (
      <OnboardingWrapper householdId={householdId}>
        {content}
      </OnboardingWrapper>
    );
  }

  return content;
}


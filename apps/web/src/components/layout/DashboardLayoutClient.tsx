'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';

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

export function DashboardLayoutClient({
  user,
  householdId,
  households,
  locale,
  children,
}: DashboardLayoutClientProps): React.JSX.Element {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // POZN.: overdueCount sa NEFETCHUJE tu (predtym to bola tretia
  // duplicitna RPC + realtime subscription). BottomNav si ho cita
  // priamo z useDashboardAlerts (rovnaky queryKey -> shared cache).

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
      {/* Mobile Bottom Navigation – z useDashboardAlerts (shared RQ cache) */}
      <BottomNav householdId={householdId} />
    </div>
  );

  if (householdId) {
    return <OnboardingWrapper householdId={householdId}>{content}</OnboardingWrapper>;
  }

  return content;
}

'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
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
  children: React.ReactNode;
}

export function DashboardLayoutClient({ user, householdId, households, children }: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const content = (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        households={households}
        currentHouseholdId={householdId}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
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


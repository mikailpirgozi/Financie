'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@finapp/ui';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { HouseholdSwitcher } from './HouseholdSwitcher';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Úvery', href: '/dashboard/loans', icon: '💰' },
  { name: 'Výdavky', href: '/dashboard/expenses', icon: '💸' },
  { name: 'Príjmy', href: '/dashboard/incomes', icon: '💵' },
  { name: 'Majetok', href: '/dashboard/assets', icon: '🏠' },
  { name: 'Mesačné výkazy', href: '/dashboard/summaries', icon: '📈' },
  { name: 'Kategórie', href: '/dashboard/categories', icon: '🏷️' },
  { name: 'Domácnosť', href: '/dashboard/household', icon: '👥' },
  { name: 'Predplatné', href: '/dashboard/subscription', icon: '💳' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  households?: Array<{ id: string; name: string; role: string }>;
  currentHouseholdId?: string;
}

export function Sidebar({ isOpen = true, onClose, households, currentHouseholdId }: SidebarProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b px-6">
        <h1 className="text-xl font-bold text-primary">FinApp</h1>
        {isMobile && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-accent rounded-lg"
            aria-label="Zavrieť menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {households && households.length > 1 && currentHouseholdId && (
        <div className="px-4 pt-4 pb-2">
          <HouseholdSwitcher households={households} currentHouseholdId={currentHouseholdId} />
        </div>
      )}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          © 2024 FinApp
        </div>
      </div>
    </>
  );

  // Desktop sidebar
  if (!isMobile) {
    return (
      <div className="hidden lg:flex h-full w-64 flex-col border-r bg-card">
        {sidebarContent}
      </div>
    );
  }

  // Mobile sidebar (drawer)
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden',
          'flex flex-col border-r bg-card',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}


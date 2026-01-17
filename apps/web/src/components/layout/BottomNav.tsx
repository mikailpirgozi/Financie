'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Wallet, Car, FileText, MoreHorizontal } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  { 
    name: 'Prehľad', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    matchPaths: ['/dashboard'],
  },
  { 
    name: 'Úvery', 
    href: '/dashboard/loans', 
    icon: Wallet,
    matchPaths: ['/dashboard/loans'],
  },
  { 
    name: 'Vozidlá', 
    href: '/dashboard/vehicles', 
    icon: Car,
    matchPaths: ['/dashboard/vehicles'],
  },
  { 
    name: 'Dokumenty', 
    href: '/dashboard/documents', 
    icon: FileText,
    matchPaths: ['/dashboard/documents'],
  },
  { 
    name: 'Viac', 
    href: '/dashboard/expenses', 
    icon: MoreHorizontal,
    matchPaths: [
      '/dashboard/expenses',
      '/dashboard/incomes',
      '/dashboard/categories',
      '/dashboard/summaries',
      '/dashboard/household',
      '/dashboard/subscription',
      '/dashboard/audit',
      '/dashboard/assets',
      '/dashboard/rules',
    ],
  },
];

interface BottomNavProps {
  overdueCount?: number;
}

export function BottomNav({ overdueCount = 0 }: BottomNavProps): React.JSX.Element {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (!pathname) return false;
    
    // Exact match for dashboard home
    if (item.href === '/dashboard' && pathname === '/dashboard') {
      return true;
    }
    
    // Check if pathname starts with any of the matchPaths
    if (item.matchPaths) {
      return item.matchPaths.some(path => 
        path === '/dashboard' 
          ? pathname === path 
          : pathname.startsWith(path)
      );
    }
    
    return pathname.startsWith(item.href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          const showBadge = item.name === 'Úvery' && overdueCount > 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors',
                'active:scale-95',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 mb-1',
                    active && 'stroke-[2.5]'
                  )}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {overdueCount > 9 ? '9+' : overdueCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  active && 'font-semibold'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

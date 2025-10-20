'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@finapp/ui';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Úvery', href: '/dashboard/loans', icon: '💰' },
  { name: 'Výdavky', href: '/dashboard/expenses', icon: '💸' },
  { name: 'Príjmy', href: '/dashboard/incomes', icon: '💵' },
  { name: 'Majetok', href: '/dashboard/assets', icon: '🏠' },
  { name: 'Mesačné výkazy', href: '/dashboard/summaries', icon: '📈' },
  { name: 'Kategórie', href: '/dashboard/categories', icon: '🏷️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">FinApp</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
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
    </div>
  );
}


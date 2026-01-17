'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@finapp/ui';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { Menu } from 'lucide-react';

interface HeaderProps {
  user: {
    email?: string;
    user_metadata?: {
      display_name?: string;
    };
  };
  locale: string;
  onMenuClick?: () => void;
}

export function Header({ user, locale, onMenuClick }: HeaderProps): React.JSX.Element {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b bg-card px-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-accent rounded-lg touch-target"
          aria-label="Otvoriť menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-sm md:text-base font-semibold truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">
          {user.user_metadata?.display_name || user.email?.split('@')[0]}
        </h2>
      </div>
      <div className="flex items-center gap-1.5 md:gap-3">
        <div className="hidden sm:block">
          <LanguageSwitcher currentLocale={locale} />
        </div>
        <ThemeToggle />
        <Button variant="outline" onClick={handleLogout} className="text-xs px-2 md:px-3 md:text-sm h-8 md:h-9">
          <span className="hidden sm:inline">Odhlásiť sa</span>
          <span className="sm:hidden">Odhl.</span>
        </Button>
      </div>
    </header>
  );
}


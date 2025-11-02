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
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-accent rounded-lg"
          aria-label="Otvoriť menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-sm md:text-lg font-semibold truncate max-w-[150px] md:max-w-none">
          Vitajte, {user.user_metadata?.display_name || user.email}
        </h2>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <LanguageSwitcher currentLocale={locale} />
        <ThemeToggle />
        <Button variant="outline" onClick={handleLogout} className="text-xs md:text-sm">
          Odhlásiť sa
        </Button>
      </div>
    </header>
  );
}


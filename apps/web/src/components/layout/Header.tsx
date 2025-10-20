'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@finapp/ui';

interface HeaderProps {
  user: {
    email?: string;
    user_metadata?: {
      display_name?: string;
    };
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">
          Vitajte, {user.user_metadata?.display_name || user.email}
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleLogout}>
          Odhlásiť sa
        </Button>
      </div>
    </header>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@finapp/ui';

export function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = (): void => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const renderIcon = (): React.JSX.Element => {
    if (!mounted) return <Monitor className="h-5 w-5" />;
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />;
      case 'dark':
        return <Moon className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const label = ((): string => {
    switch (theme) {
      case 'light':
        return 'Svetlý režim';
      case 'dark':
        return 'Tmavý režim';
      default:
        return 'Systémový režim';
    }
  })();

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} title={label} aria-label={label}>
      {renderIcon()}
    </Button>
  );
}

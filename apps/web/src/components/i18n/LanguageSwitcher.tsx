'use client';

import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@finapp/ui';

const languages = [
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (locale: string) => {
    startTransition(() => {
      document.cookie = `locale=${locale}; path=/; max-age=31536000`;
      window.location.reload();
    });
  };

  const currentLocale = 
    typeof document !== 'undefined' 
      ? document.cookie.split('; ').find(row => row.startsWith('locale='))?.split('=')[1] || 'sk'
      : 'sk';

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        disabled={isPending}
        title={currentLanguage.name}
        aria-label="Zmeniť jazyk"
      >
        <Globe className="h-5 w-5" />
      </Button>
      
      <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isPending || lang.code === currentLocale}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg ${
              lang.code === currentLocale ? 'bg-accent font-medium' : ''
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


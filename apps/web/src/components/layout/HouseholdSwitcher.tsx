'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@finapp/ui';
import { cn } from '@/lib/utils';

interface Household {
  id: string;
  name: string;
  role: string;
}

interface HouseholdSwitcherProps {
  households: Household[];
  currentHouseholdId: string;
}

export function HouseholdSwitcher(): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);

  const currentHousehold = households.find(h => h.id === currentHouseholdId);

  const handleSwitch = async (householdId: string) => {
    try {
      const response = await fetch('/api/household/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error switching household:', error);
    }
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    // TODO: Open create household modal
    alert('Vytvorenie novej domácnosti - coming soon!');
  };

  if (households.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className="truncate">{currentHousehold?.name || 'Vyberte domácnosť'}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-card border rounded-lg shadow-lg">
            <div className="p-2 space-y-1">
              {households.map((household) => (
                <button
                  key={household.id}
                  onClick={() => handleSwitch(household.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors',
                    household.id === currentHouseholdId && 'bg-accent'
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{household.name}</span>
                    <span className="text-xs text-muted-foreground">{household.role}</span>
                  </div>
                  {household.id === currentHouseholdId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
              <div className="border-t pt-2">
                <button
                  onClick={handleCreateNew}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Vytvoriť novú domácnosť
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


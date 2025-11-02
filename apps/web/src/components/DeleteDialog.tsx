'use client';

import { useState } from 'react';
import { Button } from '@finapp/ui';

interface DeleteDialogProps {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  trigger?: React.ReactNode;
}

export function DeleteDialog({ title, description, onConfirm, trigger }: DeleteDialogProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    // Use native confirm dialog
    const confirmed = window.confirm(`${title}\n\n${description}`);
    
    if (!confirmed) return;

    setLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Chyba pri mazaní. Skúste to znova.');
    } finally {
      setLoading(false);
    }
  };

  if (trigger) {
    return (
      <div onClick={handleClick} style={{ display: 'inline-block' }}>
        {trigger}
      </div>
    );
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? 'Mažem...' : 'Zmazať'}
    </Button>
  );
}


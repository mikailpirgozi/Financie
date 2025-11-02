'use client';

import { useState } from 'react';
import { Button, Input } from '@finapp/ui';
import { Mail, UserPlus } from 'lucide-react';

interface InviteFormProps {
  householdId: string;
}

export function InviteForm({ householdId }: InviteFormProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, householdId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setMessage({ type: 'success', text: 'Pozvánka bola úspešne odoslaná!' });
      setEmail('');
      setRole('member');
      
      // Reload after 2 seconds
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Nepodarilo sa odoslať pozvánku' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email adresa
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="partner@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium">
          Rola
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'member' | 'viewer')}
          disabled={isSubmitting}
          className="w-full border rounded-md px-3 py-2 bg-background text-sm"
        >
          <option value="admin">Administrátor - Plný prístup</option>
          <option value="member">Člen - Môže pridávať a upravovať</option>
          <option value="viewer">Pozorovateľ - Len čítanie</option>
        </select>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        <UserPlus className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Odosiela sa...' : 'Odoslať pozvánku'}
      </Button>
    </form>
  );
}


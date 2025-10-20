'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@finapp/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Heslá sa nezhodujú');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // Register user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registrácia zlyhala');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          display_name: displayName,
        });

      if (profileError) throw profileError;

      // Create default household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name: `${displayName}'s Household`,
        })
        .select()
        .single();

      if (householdError) throw householdError;

      // Add user as household owner
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: authData.user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // Create default categories
      const defaultCategories = [
        { kind: 'expense', name: 'Potraviny' },
        { kind: 'expense', name: 'Bývanie' },
        { kind: 'expense', name: 'Doprava' },
        { kind: 'expense', name: 'Zdravie' },
        { kind: 'expense', name: 'Zábava' },
        { kind: 'income', name: 'Mzda' },
        { kind: 'income', name: 'Podnikanie' },
        { kind: 'income', name: 'Investície' },
      ];

      const { error: categoriesError } = await supabase
        .from('categories')
        .insert(
          defaultCategories.map((cat) => ({
            household_id: household.id,
            kind: cat.kind,
            name: cat.name,
          }))
        );

      if (categoriesError) throw categoriesError;

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrácia zlyhala');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Registrácia</CardTitle>
          <CardDescription>
            Vytvorte si účet pre správu vašich financií
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Meno
              </label>
              <Input
                id="displayName"
                type="text"
                placeholder="Vaše meno"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="vas@email.sk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Heslo
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Potvrdiť heslo
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Vytváram účet...' : 'Zaregistrovať sa'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Už máte účet?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Prihláste sa
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


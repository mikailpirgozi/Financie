'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@finapp/ui';

export default function RegisterPage(): React.JSX.Element {
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
      
      console.log('🚀 Starting registration...');
      console.log('Email:', email);
      console.log('Display name:', displayName);
      
      // Register user - trigger will handle profile, household, and categories
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      console.log('Auth response:', { authData, authError });

      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        console.error('❌ No user data returned');
        throw new Error('Registrácia zlyhala - žiadne user data');
      }

      console.log('✅ User created:', authData.user.id);
      console.log('✅ Registration successful! Redirecting...');

      // Wait a bit for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to home (dashboard layout will handle the rest)
      window.location.href = '/';
      router.refresh();
    } catch (err) {
      console.error('❌ Registration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Registrácia zlyhala';
      console.error('Error message:', errorMessage);
      setError(errorMessage);
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



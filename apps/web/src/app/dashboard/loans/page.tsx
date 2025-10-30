import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@finapp/ui';
import { Card, CardContent } from '@finapp/ui';
import { LoansClient } from './LoansClient';

export default async function LoansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Úvery</h1>
          <p className="text-muted-foreground">Správa vašich úverov a splátok</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Žiadna domácnosť</h3>
            <p className="text-muted-foreground text-center mb-4">
              Nemáte priradenú žiadnu domácnosť. Kontaktujte administrátora alebo sa zaregistrujte znova.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get loans
  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Úvery</h1>
          <p className="text-muted-foreground">
            Správa vašich úverov a splátok
          </p>
        </div>
        <Link href="/dashboard/loans/new">
          <Button>➕ Nový úver</Button>
        </Link>
      </div>

      {!loans || loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-lg font-semibold mb-2">Žiadne úvery</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatiaľ nemáte vytvorený žiadny úver. Začnite pridaním nového úveru.
            </p>
            <Link href="/dashboard/loans/new">
              <Button>Pridať prvý úver</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <LoansClient loans={loans} />
      )}
    </div>
  );
}



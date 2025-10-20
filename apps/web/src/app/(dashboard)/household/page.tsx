import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';
import { HouseholdMembers } from '@/components/household/HouseholdMembers';
import { InviteForm } from '@/components/household/InviteForm';

export default async function HouseholdPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Žiadna domácnosť</CardTitle>
            <CardDescription>
              Zatiaľ nemáte vytvorenú domácnosť. Kontaktujte administrátora.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get household details
  const { data: household } = await supabase
    .from('households')
    .select('*')
    .eq('id', membership.household_id)
    .single();

  // Get all members
  const { data: members } = await supabase
    .from('household_members')
    .select(`
      *,
      profiles:user_id (
        email,
        display_name
      )
    `)
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: true });

  const isOwner = membership.role === 'owner';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Správa domácnosti</h1>
        <p className="text-muted-foreground">
          Spravujte členov a nastavenia vašej domácnosti
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informácie o domácnosti</CardTitle>
            <CardDescription>Základné údaje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Názov</div>
              <div className="text-lg font-semibold">{household?.name || 'Moja domácnosť'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Vaša rola</div>
              <div className="text-lg">
                {membership.role === 'owner' && '👑 Vlastník'}
                {membership.role === 'admin' && '⚙️ Administrátor'}
                {membership.role === 'member' && '👤 Člen'}
                {membership.role === 'viewer' && '👁️ Pozorovateľ'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Počet členov</div>
              <div className="text-lg font-semibold">{members?.length || 0}</div>
            </div>
          </CardContent>
        </Card>

        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>Pozvať člena</CardTitle>
              <CardDescription>Pridajte nového člena do domácnosti</CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm householdId={membership.household_id} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Členovia domácnosti</CardTitle>
          <CardDescription>Zoznam všetkých členov a ich oprávnení</CardDescription>
        </CardHeader>
        <CardContent>
          <HouseholdMembers 
            members={members || []} 
            currentUserId={user.id}
            isOwner={isOwner}
            householdId={membership.household_id}
          />
        </CardContent>
      </Card>
    </div>
  );
}


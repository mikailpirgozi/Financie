import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';
import { getAuditLogs, AuditAction, AuditEntityType } from '@/lib/audit/logger';
import { AuditFilters } from './AuditFilters';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactNode> {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Nemáte prístup k audit logu</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get filters from search params
  const entityType = resolvedSearchParams.entityType as string | undefined;
  const action = resolvedSearchParams.action as string | undefined;
  const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit as string) : 50;

  const logs = await getAuditLogs(membership.household_id, {
    entityType: entityType as AuditEntityType | undefined,
    action: action as AuditAction | undefined,
    limit,
  });

  const actionLabels: Record<string, string> = {
    create: 'Vytvorené',
    update: 'Upravené',
    delete: 'Zmazané',
    payment: 'Platba',
    early_repayment: 'Predčasné splatenie',
  };

  const entityLabels: Record<string, string> = {
    loan: 'Úver',
    expense: 'Výdavok',
    income: 'Príjem',
    asset: 'Majetok',
    household_member: 'Člen domácnosti',
    category: 'Kategória',
    payment: 'Platba',
  };

  const actionColors: Record<string, string> = {
    create: 'text-green-600',
    update: 'text-blue-600',
    delete: 'text-red-600',
    payment: 'text-purple-600',
    early_repayment: 'text-orange-600',
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">História všetkých zmien a operácií</p>
      </div>

      {/* Filters */}
      <AuditFilters />

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit záznamy ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Žiadne audit záznamy
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                const profile = log.profiles as unknown as {
                  display_name: string | null;
                  email: string;
                } | null;

                return (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-semibold ${actionColors[log.action]}`}>
                            {actionLabels[log.action] || log.action}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-medium">
                            {entityLabels[log.entity_type] || log.entity_type}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>
                            Používateľ: {profile?.display_name || profile?.email || 'Unknown'}
                          </div>
                          <div>
                            Čas:{' '}
                            {new Date(log.created_at).toLocaleString('sk-SK', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {log.ip_address && (
                            <div className="text-xs">IP: {log.ip_address}</div>
                          )}
                        </div>
                      </div>
                      {log.changes && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:underline">
                            Zobraziť zmeny
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-w-md">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


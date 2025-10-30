'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const [info, setInfo] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setInfo({ error: 'No user logged in' });
          setLoading(false);
          return;
        }

        // Get household
        const { data: membership } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          setInfo({ error: 'No household found', userId: user.id });
          setLoading(false);
          return;
        }

        const householdId = membership.household_id;

        // Test API endpoint
        const testResponse = await fetch(`/api/dashboard/test?householdId=${householdId}`);
        const testData = await testResponse.json();

        // Test dashboard endpoint
        const dashboardResponse = await fetch(`/api/dashboard?householdId=${householdId}&monthsCount=3`);
        const dashboardData = await dashboardResponse.json();

        setInfo({
          user: { id: user.id, email: user.email },
          householdId,
          testEndpoint: testData,
          dashboardEndpoint: {
            status: dashboardResponse.status,
            ok: dashboardResponse.ok,
            data: dashboardData,
          },
        });
      } catch (error) {
        setInfo({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        setLoading(false);
      }
    };

    loadDebugInfo();
  }, [supabase]);

  if (loading) {
    return <div className="p-8">Loading debug info...</div>;
  }

  return (
    <div className="p-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(info, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}


import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export type AuditAction = 'create' | 'update' | 'delete' | 'payment' | 'early_repayment';
export type AuditEntityType = 
  | 'loan' 
  | 'expense' 
  | 'income' 
  | 'asset' 
  | 'household_member' 
  | 'category' 
  | 'payment'
  | 'insurance'
  | 'vehicle'
  | 'vehicle_document'
  | 'service_record'
  | 'fine'
  | 'insurance_claim';

interface AuditLogData {
  householdId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  changes?: {
    old_value?: Record<string, unknown>;
    new_value?: Record<string, unknown>;
  };
  request?: NextRequest;
}

export async function logAudit({
  householdId,
  userId,
  action,
  entityType,
  entityId,
  changes,
  request,
}: AuditLogData): Promise<void> {
  const supabase = await createClient();

  const ipAddress = request?.headers.get('x-forwarded-for') || 
                    request?.headers.get('x-real-ip') || 
                    null;
  const userAgent = request?.headers.get('user-agent') || null;

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      household_id: householdId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

  if (error) {
    console.error('Failed to log audit:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

export async function getAuditLogs(
  householdId: string,
  filters?: {
    entityType?: AuditEntityType;
    action?: AuditAction;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();

  let query = supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      changes,
      ip_address,
      user_agent,
      created_at,
      profiles:user_id (
        id,
        email,
        display_name
      )
    `)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters?.action) {
    query = query.eq('action', filters.action);
  }

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return data;
}

export async function getAuditLogForEntity(
  entityType: AuditEntityType,
  entityId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      changes,
      created_at,
      profiles:user_id (
        id,
        email,
        display_name
      )
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch entity audit logs: ${error.message}`);
  }

  return data;
}


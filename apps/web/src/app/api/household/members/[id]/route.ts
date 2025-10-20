import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { role } = await request.json();

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get member details
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id, user_id, role')
      .eq('id', id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if current user is owner
    const { data: currentMembership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', member.household_id)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership || currentMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can change member roles' },
        { status: 403 }
      );
    }

    // Cannot change owner role
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      );
    }

    // Update role
    const { error: updateError } = await supabase
      .from('household_members')
      .update({ role })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get member details
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id, user_id, role')
      .eq('id', id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if current user is owner
    const { data: currentMembership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', member.household_id)
      .eq('user_id', user.id)
      .single();

    if (!currentMembership || currentMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can remove members' },
        { status: 403 }
      );
    }

    // Cannot remove owner
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove household owner' },
        { status: 400 }
      );
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('household_members')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


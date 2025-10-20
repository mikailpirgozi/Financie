import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role, householdId } = await request.json();

    // Validate input
    if (!email || !role || !householdId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user is owner or admin
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can invite members' },
        { status: 403 }
      );
    }

    // Check if user with email exists
    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!invitedUser) {
      return NextResponse.json(
        { error: 'User with this email does not exist. They need to register first.' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', invitedUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this household' },
        { status: 400 }
      );
    }

    // Add user to household
    const { error: insertError } = await supabase
      .from('household_members')
      .insert({
        household_id: householdId,
        user_id: invitedUser.id,
        role,
      });

    if (insertError) {
      console.error('Error adding member:', insertError);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    // TODO: Send email notification to invited user

    return NextResponse.json({ success: true, message: 'Member added successfully' });
  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


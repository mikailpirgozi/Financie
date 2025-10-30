import { createClient } from '@/lib/supabase/server';
import { stripe } from './server';
import { STRIPE_PLANS } from './config';

export async function updateSubscriptionInDB(
  userId: string,
  customerId: string,
  subscriptionId: string,
  planId: string,
  status: string,
  currentPeriodEnd: Date
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_plan: planId,
      subscription_status: status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update subscription in DB: ${error.message}`);
  }
}

export async function checkSubscriptionLimits(
  userId: string,
  limitType: 'households' | 'members' | 'loans' | 'categories'
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const supabase = await createClient();

  // Get user's subscription plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new Error('User profile not found');
  }

  const plan = STRIPE_PLANS[profile.subscription_plan as keyof typeof STRIPE_PLANS] || STRIPE_PLANS.free;
  const limit = plan.limits[limitType];

  // If limit is -1, it's unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, current: 0 };
  }

  // Check current usage based on limit type
  let current = 0;

  switch (limitType) {
    case 'households': {
      const { count } = await supabase
        .from('household_members')
        .select('household_id', { count: 'exact', head: true })
        .eq('user_id', userId);
      current = count || 0;
      break;
    }

    case 'members': {
      // Get user's households
      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId);

      if (memberships && memberships.length > 0) {
        // Count members across all user's households
        const householdIds = memberships.map(m => m.household_id);
        const { count } = await supabase
          .from('household_members')
          .select('id', { count: 'exact', head: true })
          .in('household_id', householdIds);
        current = count || 0;
      }
      break;
    }

    case 'loans': {
      // Get user's households
      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId);

      if (memberships && memberships.length > 0) {
        const householdIds = memberships.map(m => m.household_id);
        const { count } = await supabase
          .from('loans')
          .select('id', { count: 'exact', head: true })
          .in('household_id', householdIds);
        current = count || 0;
      }
      break;
    }

    case 'categories': {
      // Get user's households
      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId);

      if (memberships && memberships.length > 0) {
        const householdIds = memberships.map(m => m.household_id);
        const { count } = await supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .in('household_id', householdIds);
        current = count || 0;
      }
      break;
    }
  }

  return {
    allowed: current < limit,
    limit,
    current,
  };
}

export async function cancelSubscription(userId: string): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const supabase = await createClient();

  // Get user's subscription ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  // Cancel subscription at period end
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update status in DB
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update subscription status: ${error.message}`);
  }
}

export async function reactivateSubscription(userId: string): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const supabase = await createClient();

  // Get user's subscription ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    throw new Error('No subscription found');
  }

  // Reactivate subscription
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Update status in DB
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update subscription status: ${error.message}`);
  }
}


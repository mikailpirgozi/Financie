import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.customer && session.subscription) {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          const userId = session.metadata?.user_id;
          const planId = session.metadata?.plan_id;

          if (!userId) {
            console.error('No user_id in session metadata');
            break;
          }

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          // Update user profile with subscription info
          const currentPeriodEnd = 'current_period_end' in subscription 
            ? new Date((subscription.current_period_end as number) * 1000).toISOString()
            : new Date().toISOString();

          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_plan: planId || 'pro',
              subscription_status: subscription.status,
              subscription_current_period_end: currentPeriodEnd,
            })
            .eq('id', userId);

          if (updateError) {
            console.error('Error updating profile:', updateError);
          } else {
            console.log(`Subscription created for user ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error(`No profile found for customer ${customerId}`);
          break;
        }

        // Determine plan from subscription items
        const planId = determinePlanFromSubscription(subscription);

        // Update subscription status
        const currentPeriodEnd = 'current_period_end' in subscription 
          ? new Date((subscription.current_period_end as number) * 1000).toISOString()
          : new Date().toISOString();

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_plan: planId,
            subscription_status: subscription.status,
            subscription_current_period_end: currentPeriodEnd,
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        } else {
          console.log(`Subscription updated for user ${profile.id}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error(`No profile found for customer ${customerId}`);
          break;
        }

        // Downgrade to free plan
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_subscription_id: null,
            subscription_plan: 'free',
            subscription_status: 'canceled',
            subscription_current_period_end: null,
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error downgrading subscription:', updateError);
        } else {
          console.log(`Subscription canceled for user ${profile.id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error(`No profile found for customer ${customerId}`);
          break;
        }

        // Update subscription status to past_due
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error updating subscription status:', updateError);
        }

        // TODO: Send email notification about failed payment
        console.log(`Payment failed for user ${profile.id} (${profile.email})`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

function determinePlanFromSubscription(subscription: Stripe.Subscription): string {
  // Get the first price ID from subscription items
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) return 'free';

  // Match against known price IDs
  const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID;
  const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;

  if (priceId === proPriceId) return 'pro';
  if (priceId === premiumPriceId) return 'premium';

  return 'free';
}


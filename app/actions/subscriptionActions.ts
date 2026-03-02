'use server'

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

let _stripe: Stripe | null = null
function getStripe(): Stripe {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not set')
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-01-27' as any,
        })
    }
    return _stripe
}

export async function getUserSubscription(userEmail: string) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_email', userEmail)
        .single()

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error)
    }

    return data || { plan: 'free', status: 'none' }
}

export async function createCheckoutSession(userEmail: string) {
    try {
        if (!process.env.STRIPE_PREMIUM_PRICE_ID) {
            return { error: 'STRIPE_PREMIUM_PRICE_ID is not configured' }
        }

        const stripe = getStripe()

        console.log('Creating checkout for:', userEmail, 'price:', process.env.STRIPE_PREMIUM_PRICE_ID)

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_PREMIUM_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?canceled=true`,
            customer_email: userEmail,
            metadata: {
                userEmail,
            },
        })

        return { sessionId: session.id, url: session.url || '' }
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error.message)
        return { error: error.message || 'Unknown Stripe error' }
    }
}

export async function createPortalSession(userEmail: string) {
    try {
        // Look up the customer ID from the subscriptions table
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_email', userEmail)
            .single()

        if (!sub?.stripe_customer_id) {
            throw new Error('No active subscription found')
        }

        const stripe = getStripe()
        const session = await stripe.billingPortal.sessions.create({
            customer: sub.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`,
        })

        return { url: session.url }
    } catch (error: any) {
        console.error('Stripe Portal Error:', error)
        throw new Error(error.message)
    }
}

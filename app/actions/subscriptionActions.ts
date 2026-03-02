'use server'

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27' as any,
})

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

        return { sessionId: session.id, url: session.url }
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error)
        throw new Error(error.message)
    }
}

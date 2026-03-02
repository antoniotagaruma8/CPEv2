import { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export const config = {
    api: {
        bodyParser: false,
    },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        return res.status(405).end('Method Not Allowed')
    }

    const buf = await buffer(req)
    const sig = req.headers['stripe-signature']!

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`)
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const userEmail = session.metadata?.userEmail || session.customer_email

                if (userEmail) {
                    await supabase.from('subscriptions').upsert({
                        user_email: userEmail,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string,
                        plan: 'premium',
                        status: 'active',
                        current_period_end: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(), // Roughly a month, actual date should come from subscription object
                        updated_at: new Date().toISOString(),
                    })
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('user_email')
                    .eq('stripe_subscription_id', subscription.id)
                    .single()

                if (sub?.user_email) {
                    await supabase.from('subscriptions').update({
                        plan: 'free',
                        status: 'canceled',
                        updated_at: new Date().toISOString(),
                    }).eq('user_email', sub.user_email)
                }
                break
            }

            default:
                console.log(`Unhandled event type ${event.type}`)
        }
    } catch (err: any) {
        console.error(`Database Error: ${err.message}`)
        return res.status(500).send(`Database Error: ${err.message}`)
    }

    res.json({ received: true })
}

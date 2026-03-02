'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const ADMIN_EMAILS = [
    'antoniotagaruma7@gmail.com',
    'antoniotagaruma8@gmail.com',
    'public.y2026@gmail.com',
]

const FREE_GENERATION_LIMIT = 30

export async function getGenerationInfo(userEmail: string) {
    const isAdmin = ADMIN_EMAILS.includes(userEmail)

    if (isAdmin) {
        return { allowed: true, count: 0, limit: Infinity, isAdmin: true }
    }

    // Try to get existing record
    const { data, error } = await supabase
        .from('user_generations')
        .select('generation_count')
        .eq('user_email', userEmail)
        .single()

    if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine for new users
        console.error('Error fetching generation count:', error)
    }

    const count = data?.generation_count || 0
    const allowed = count < FREE_GENERATION_LIMIT

    return { allowed, count, limit: FREE_GENERATION_LIMIT, isAdmin: false }
}

export async function incrementGenerationCount(userEmail: string) {
    const isAdmin = ADMIN_EMAILS.includes(userEmail)
    if (isAdmin) return { success: true }

    // Upsert: increment if exists, insert with count=1 if new
    const { data: existing } = await supabase
        .from('user_generations')
        .select('generation_count')
        .eq('user_email', userEmail)
        .single()

    if (existing) {
        const { error } = await supabase
            .from('user_generations')
            .update({
                generation_count: existing.generation_count + 1,
                updated_at: new Date().toISOString(),
            })
            .eq('user_email', userEmail)

        if (error) {
            console.error('Error incrementing generation count:', error)
            return { success: false, error: error.message }
        }
    } else {
        const { error } = await supabase
            .from('user_generations')
            .insert({
                user_email: userEmail,
                generation_count: 1,
            })

        if (error) {
            console.error('Error creating generation record:', error)
            return { success: false, error: error.message }
        }
    }

    return { success: true }
}

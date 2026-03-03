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

const FREE_GENERATION_LIMIT = 10
const PREMIUM_GENERATION_LIMIT = 100

export async function getGenerationStatus(userEmail: string, deviceId?: string) {
    const isAdmin = ADMIN_EMAILS.includes(userEmail)

    // Check subscription status
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_email', userEmail)
        .single()

    const isPremium = sub?.plan === 'premium'

    if (isAdmin) {
        return { allowed: true, count: 0, limit: Infinity, isAdmin: true, plan: 'admin' }
    }

    // Always fetch user record
    const { data: userData, error: userError } = await supabase
        .from('user_generations')
        .select('generation_count')
        .eq('user_email', userEmail)
        .single()

    if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user generation count:', userError)
    }

    const userCount = userData?.generation_count || 0;
    let maxCount = userCount;
    const limit = isPremium ? PREMIUM_GENERATION_LIMIT : FREE_GENERATION_LIMIT;

    // If they have a deviceId and are NOT premium, check their device limits
    if (deviceId && !isPremium) {
        const { data: deviceData, error: deviceError } = await supabase
            .from('device_generations')
            .select('generation_count')
            .eq('device_id', deviceId)
            .single()

        if (deviceError && deviceError.code !== 'PGRST116') {
            console.error('Error fetching device generation count:', deviceError)
        }

        const deviceCount = deviceData?.generation_count || 0;
        // The highest count wins (if they generated 10 on this machine, even a fresh email is blocked)
        maxCount = Math.max(userCount, deviceCount);
    }

    const allowed = maxCount < limit

    return {
        allowed,
        count: maxCount,
        limit,
        isAdmin: false,
        plan: isPremium ? 'premium' : 'free'
    }
}

export async function getGenerationInfo(userEmail: string, deviceId?: string) {
    return getGenerationStatus(userEmail, deviceId)
}

export async function incrementGenerationCount(userEmail: string, deviceId?: string) {
    const isAdmin = ADMIN_EMAILS.includes(userEmail)
    if (isAdmin) return { success: true }

    // 1. Update/Insert for Email
    const { data: existingUser } = await supabase
        .from('user_generations')
        .select('generation_count')
        .eq('user_email', userEmail)
        .single()

    if (existingUser) {
        const { error: updateUserError } = await supabase
            .from('user_generations')
            .update({
                generation_count: existingUser.generation_count + 1,
                updated_at: new Date().toISOString(),
            })
            .eq('user_email', userEmail)

        if (updateUserError) console.error('Error incrementing user count:', updateUserError);
    } else {
        const { error: insertUserError } = await supabase
            .from('user_generations')
            .insert({ user_email: userEmail, generation_count: 1 })

        if (insertUserError) console.error('Error creating user record:', insertUserError);
    }

    // 2. Update/Insert for Device ID (Only if provided)
    if (deviceId) {
        const { data: existingDevice } = await supabase
            .from('device_generations')
            .select('generation_count')
            .eq('device_id', deviceId)
            .single()

        if (existingDevice) {
            const { error: updateDeviceError } = await supabase
                .from('device_generations')
                .update({
                    generation_count: existingDevice.generation_count + 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('device_id', deviceId)

            if (updateDeviceError) console.error('Error incrementing device count:', updateDeviceError);
        } else {
            const { error: insertDeviceError } = await supabase
                .from('device_generations')
                .insert({ device_id: deviceId, generation_count: 1 })

            if (insertDeviceError) console.error('Error creating device record:', insertDeviceError);
        }
    }

    return { success: true }
}

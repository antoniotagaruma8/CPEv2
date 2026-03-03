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

export async function checkIsAdmin(userEmail: string | undefined | null) {
    if (!userEmail) return false;
    return ADMIN_EMAILS.includes(userEmail);
}

export async function getAdminStats(userEmail: string) {
    if (!ADMIN_EMAILS.includes(userEmail)) {
        throw new Error('Unauthorized');
    }

    try {
        // 1. Get total unique users (from user_generations)
        const { count: totalUsersCount, error: usersError } = await supabase
            .from('user_generations')
            .select('*', { count: 'exact', head: true });

        // 2. Get premium subscriptions
        const { count: premiumCount, data: premiumData, error: subsError } = await supabase
            .from('subscriptions')
            .select('user_email, created_at, plan', { count: 'exact' })
            .eq('plan', 'premium')
            .order('created_at', { ascending: false });

        const premiumEmails = new Set(premiumData?.map(s => s.user_email) || []);

        // 3. Get total exams generated
        const { count: totalExamsCount, error: examsError } = await supabase
            .from('exams')
            .select('*', { count: 'exact', head: true });

        // 4. Get recent user activity (top 50 by generation count or recent updates)
        const { data: recentUsers, error: recentUsersError } = await supabase
            .from('user_generations')
            .select('user_email, generation_count, updated_at')
            .order('updated_at', { ascending: false })
            .limit(50);

        const enrichedUsers = recentUsers?.map((user: any) => ({
            ...user,
            isPremium: premiumEmails.has(user.user_email)
        })) || [];

        // 5. Get recent saved exams to see what people are generating
        const { data: recentExamsRow, error: recentExamsError } = await supabase
            .from('exams')
            .select('id, user_email, type, level, topic, created_at, is_favorite')
            .order('created_at', { ascending: false })
            .limit(20);

        const recentExams = recentExamsRow?.map((exam: any) => ({
            ...exam,
            isPremium: premiumEmails.has(exam.user_email)
        })) || [];

        if (usersError || subsError || examsError) {
            console.error('Error fetching aggregate stats:', usersError || subsError || examsError);
        }

        return {
            totalUsers: totalUsersCount || 0,
            premiumUsers: premiumCount || 0,
            premiumDataList: premiumData || [],
            totalExamsGenerated: totalExamsCount || 0,
            recentUsers: enrichedUsers,
            recentExams: recentExams || []
        };
    } catch (error) {
        console.error('Error in getAdminStats:', error);
        throw new Error('Failed to fetch admin stats');
    }
}

export async function resetDeviceLimit(userEmail: string, deviceId: string) {
    if (!ADMIN_EMAILS.includes(userEmail)) {
        throw new Error('Unauthorized');
    }

    try {
        const { error } = await supabase
            .from('device_generations')
            .delete()
            .eq('device_id', deviceId);

        if (error) {
            console.error('Error resetting device limit:', error);
            throw new Error(error.message);
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error in resetDeviceLimit:', error);
        throw new Error(error.message || 'Failed to reset device limit');
    }
}

'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function isUserTeacher(email: string) {
    if (!email) return false;

    const { data, error } = await supabase
        .from('teachers')
        .select('email')
        .eq('email', email)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error checking teacher status:', error);
    }

    return !!data;
}

export async function activateTeacherStatus(email: string, code: string) {
    if (!email) return { success: false, error: 'Not logged in' };
    if (!code) return { success: false, error: 'Code is required' };

    // Support either a single code or a comma-separated list of codes
    const codesEnv = process.env.TEACHER_ACCESS_CODES || process.env.TEACHER_ACCESS_CODE;
    if (!codesEnv) {
        return { success: false, error: 'Teacher access codes are not configured on the server. Please contact the administrator.' };
    }

    const validCodes = codesEnv.split(',').map(c => c.trim().toLowerCase());
    const submittedCode = code.trim().toLowerCase();

    if (!validCodes.includes(submittedCode)) {
        return { success: false, error: 'Invalid teacher access code.' };
    }

    // Check if already a teacher
    const isAlreadyTeacher = await isUserTeacher(email);
    if (isAlreadyTeacher) {
        return { success: true, message: 'Your account is already a teacher account!' };
    }

    // Insert into teachers table and record which code they used
    const { error } = await supabase
        .from('teachers')
        .insert({ email, affiliation: code.trim() });

    if (error) {
        console.error('Error activating teacher status:', error);
        return { success: false, error: 'Failed to activate teacher status. Please try again.' };
    }

    return { success: true };
}

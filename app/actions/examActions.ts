'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function saveExam(exam: any, userEmail: string) {
  const { data, error } = await supabase
    .from('exams')
    .insert([
      {
        user_email: userEmail,
        type: exam.type,
        level: exam.level,
        topic: exam.topic,
        data: exam.data,
      },
    ])
    .select()

  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message)
  }
  return data?.[0]
}

export async function getSavedExams(userEmail: string) {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching exams:', error)
    return []
  }
  return data
}

export async function deleteSavedExam(examId: string) {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', examId)

  if (error) {
    throw new Error(error.message)
  }
  return true
}
'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();

  if (!email || !password) {
    redirect('/login?status=error&message=Email+and+password+are+required');
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect('/login?status=error&message=Invalid+login+credentials');
    }

    redirect('/admin');
  } catch (err) {
    redirect('/login?status=error&message=Supabase+is+not+configured');
  }
}

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuthState = {
  user: { id: string; email?: string | null } | null;
  isAdmin: boolean;
  error?: string;
};

export async function getUserAndAdmin(): Promise<AuthState> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { user: null, isAdmin: false, error: authError?.message };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      return { user: authData.user, isAdmin: false, error: profileError.message };
    }

    return {
      user: { id: authData.user.id, email: authData.user.email },
      isAdmin: Boolean(profile?.is_admin)
    };
  } catch (error) {
    return { user: null, isAdmin: false, error: (error as Error).message };
  }
}

export async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Please log in first.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw new Error('Not authorized.');
  }

  return { supabase, user: authData.user };
}

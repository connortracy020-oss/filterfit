import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    // ignore missing env in logout
  }

  return NextResponse.redirect(new URL('/', request.url));
}

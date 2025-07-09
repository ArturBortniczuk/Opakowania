// supabase/functions/set-password/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import bcrypt from 'https://deno.land/x/bcrypt@v0.4.0/mod.ts';

serve(async (req) => {
  const { nip, password, loginMode } = await req.json();
  const table = loginMode === 'admin' ? 'admin_users' : 'users';

  if (!password || password.length < 6) {
    return new Response(JSON.stringify({ error: 'Hasło musi mieć co najmniej 6 znaków.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const updateData = {
      password_hash: passwordHash,
      ...(loginMode === 'client' && { is_first_login: false }),
    };

    const { data: updatedUser, error } = await supabase
      .from(table)
      .update(updateData)
      .eq('nip', nip)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ user: updatedUser }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})

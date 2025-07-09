// supabase/functions/sign-in/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import bcrypt from 'https://deno.land/x/bcrypt@v0.4.0/mod.ts';

serve(async (req) => {
  const { nip, password, loginMode } = await req.json();
  const table = loginMode === 'admin' ? 'admin_users' : 'users';

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: userData, error: userError } = await supabase
      .from(table)
      .select('password_hash, name, nip, role, email, id, username, permissions')
      .eq('nip', nip)
      .maybeSingle();

    if (userError) throw userError;
    if (!userData) {
        return new Response(JSON.stringify({ error: 'Nie znaleziono użytkownika.' }), { status: 404 });
    }

    const isValidPassword = await bcrypt.compare(password, userData.password_hash);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowe hasło.' }), { status: 401 });
    }

    // W przyszłości, tutaj wygenerujesz i zwrócisz token JWT.
    // Na razie zwracamy dane użytkownika, aby utrzymać kompatybilność.

    return new Response(JSON.stringify({ user: userData }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})

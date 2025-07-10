import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { nip, password, loginMode } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const table = loginMode === 'admin' ? 'admin_users' : 'users';

    const { data: userData, error: userError } = await supabase
      .from(table)
      .select('*, password_hash')
      .eq('nip', nip)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: `Nie znaleziono konta dla NIP: ${nip}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    if (!userData.password_hash) {
      return new Response(JSON.stringify({ error: 'Użytkownik nie ma ustawionego hasła.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const isValidPassword = await bcrypt.compare(password, userData.password_hash);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowe hasło.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    delete userData.password_hash;

    return new Response(JSON.stringify({ user: userData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Błąd w funkcji sign-in:', error.message);
    return new Response(JSON.stringify({ error: 'Wystąpił wewnętrzny błąd serwera: ' + error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
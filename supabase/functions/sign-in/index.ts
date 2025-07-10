// Plik: supabase/functions/sign-in/index.ts
// WERSJA FINALNA

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { compareSync } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

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
      .select('*')
      .eq('nip', nip)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono użytkownika o podanym NIP.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!userData.password_hash) {
      return new Response(JSON.stringify({ error: 'Użytkownik nie ma ustawionego hasła.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isValidPassword = compareSync(password, userData.password_hash);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowe hasło.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    delete userData.password_hash;
    
    return new Response(JSON.stringify({ user: userData }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Błąd serwera: ${error.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})
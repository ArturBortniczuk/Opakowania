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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const isPracownik = loginMode === 'pracownik';
    const table = isPracownik ? 'salespeople' : (loginMode === 'admin' ? 'admin_users' : 'users');
    const keyField = isPracownik ? 'email' : 'nip';
    const keyValue = isPracownik ? nip.trim().toLowerCase() : nip;
    
    const { data: userData, error: userError } = await supabase
      .from(table)
      .select('*')
      .eq(keyField, keyValue)
      .single();

    const genericError = isPracownik ? 'Nieprawidłowy e-mail lub hasło.' : 'Nieprawidłowy NIP lub hasło.';
    const genericErrorResponse = new Response(JSON.stringify({ error: genericError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (userError || !userData || !userData.password_hash) {
      return genericErrorResponse;
    }

    const isValidPassword = compareSync(password, userData.password_hash);

    if (!isValidPassword) {
      return genericErrorResponse;
    }

    delete userData.password_hash;
    
    return new Response(JSON.stringify({ user: userData }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Błąd serwera: ${error.message}` }), { status: 500 });
  }
})
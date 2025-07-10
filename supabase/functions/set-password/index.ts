// Plik: supabase/functions/set-password/index.ts
// WERSJA FINALNA

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Używamy funkcji synchronicznej, aby uniknąć problemów w środowisku Deno
import { hashSync } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

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

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Hasło musi mieć co najmniej 6 znaków.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const saltRounds = 12;
    // Używamy `hashSync` zamiast `await bcrypt.hash`
    const passwordHash = hashSync(password, saltRounds);

    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    
    if (loginMode === 'client') {
      // Dla klienta, tworzymy lub aktualizujemy wpis
      const { data, error } = await supabase
        .from(table)
        .upsert({ nip, password_hash: passwordHash, is_first_login: false }, { onConflict: 'nip' })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ user: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      // Dla admina, tylko aktualizujemy istniejący wpis
      const { data, error } = await supabase
        .from(table)
        .update({ password_hash: passwordHash })
        .eq('nip', nip)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ user: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: `Błąd serwera: ${error.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})

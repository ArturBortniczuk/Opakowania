// supabase/functions/sign-in/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// POPRAWIONY IMPORT: Zamiast 'import bcrypt from ...' używamy 'import * as bcrypt from ...'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.0/mod.ts';

// Pełne, jawne nagłówki CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nip, password, loginMode } = await req.json();
    const table = loginMode === 'admin' ? 'admin_users' : 'users';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: userData, error: userError } = await supabase
      .from(table)
      .select('password_hash, name, nip, role, email, id, username')
      .eq('nip', nip)
      .maybeSingle();

    if (userError) throw userError;
    if (!userData || !userData.password_hash) {
        return new Response(JSON.stringify({ error: 'Nie znaleziono użytkownika lub użytkownik nie ma hasła.' }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
        });
    }

    const isValidPassword = await bcrypt.compare(password, userData.password_hash);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowe hasło.' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
      });
    }
    
    const userToReturn = { ...userData, permissions: [] };

    return new Response(JSON.stringify({ user: userToReturn }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})

// supabase/functions/set-password/index.ts
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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nip, password, loginMode } = await req.json();
    const table = loginMode === 'admin' ? 'admin_users' : 'users';

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Hasło musi mieć co najmniej 6 znaków.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let updatedUser;
    let error;

    if (loginMode === 'admin') {
      // Dla administratora, zakładamy że konto już istnieje i tylko aktualizujemy hasło
      const result = await supabase
        .from('admin_users')
        .update({ password_hash: passwordHash })
        .eq('nip', nip)
        .select()
        .single();
      updatedUser = result.data;
      error = result.error;
    } else {
      // Dla klienta, używamy "upsert": utwórz jeśli nie istnieje, w przeciwnym razie zaktualizuj.
      const result = await supabase
        .from('users')
        .upsert(
          {
            nip: nip, // Klucz do sprawdzania konfliktu
            password_hash: passwordHash,
            is_first_login: false
          },
          { onConflict: 'nip' } // Kolumna, na podstawie której rozpoznajemy konflikt
        )
        .select()
        .single();
      updatedUser = result.data;
      error = result.error;
    }

    if (error) throw error;
    if (!updatedUser) throw new Error("Nie udało się utworzyć lub zaktualizować użytkownika.");


    return new Response(JSON.stringify({ user: updatedUser }), {
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
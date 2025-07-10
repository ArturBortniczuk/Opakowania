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

    let finalUser;

    if (loginMode === 'admin') {
      // --- LOGIKA DLA ADMINA: Zawsze aktualizujemy istniejący rekord ---
      const { data: updatedAdmin, error: adminError } = await supabase
        .from('admin_users')
        .update({ password_hash: passwordHash })
        .eq('nip', nip)
        .select()
        .single();

      if (adminError) throw adminError;
      if (!updatedAdmin) throw new Error("Nie znaleziono administratora o podanym NIP.");

      finalUser = updatedAdmin;

    } else {
      // --- LOGIKA DLA KLIENTA: Tworzymy nowy rekord użytkownika jeśli nie istnieje ---
      const { data: updatedUser, error: userError } = await supabase
        .from('users')
        .upsert(
          { nip: nip, password_hash: passwordHash, is_first_login: false },
          { onConflict: 'nip' }
        )
        .select()
        .single();

      if (userError) throw userError;
      if (!updatedUser) throw new Error("Nie udało się utworzyć użytkownika klienta.");

      finalUser = updatedUser;
    }

    // Zwracamy odpowiedź z danymi użytkownika
    return new Response(JSON.stringify({ user: finalUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Błąd w funkcji set-password:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
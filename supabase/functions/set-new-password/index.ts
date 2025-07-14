import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hashSync, genSaltSync } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 6) {
      throw new Error('Nieprawidłowe dane wejściowe. Hasło musi mieć co najmniej 6 znaków.');
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Krok 1: Zahaszuj otrzymany token, aby porównać go z hashem w bazie danych
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashString = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Krok 2: Znajdź pasujący token w bazie
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_tokens')
      .select('nip, expires_at')
      .eq('token_hash', hashString)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Link jest nieprawidłowy lub został już wykorzystany.');
    }

    // Krok 3: Sprawdź, czy token nie wygasł
    if (new Date(tokenData.expires_at) < new Date()) {
        await supabase.from('password_tokens').delete().eq('nip', tokenData.nip);
        throw new Error('Link wygasł. Poproś o nowy link do ustawienia hasła.');
    }
    
    // Krok 4: Haszuj nowe hasło - POPRAWIONA LOGIKA
    // Najpierw generujemy "sól", a potem haszujemy hasło z jej użyciem.
    const salt = genSaltSync(12);
    const passwordHash = hashSync(password, salt);
    
    const { nip } = tokenData;
    
    // Krok 5: Zapisz nowego użytkownika lub zaktualizuj istniejącego (operacja "upsert")
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({ nip, password_hash: passwordHash, is_first_login: false }, { onConflict: 'nip' })
      .select()
      .single();

    if (userError) {
      console.error('[set-new-password] Błąd podczas upsert użytkownika:', userError);
      throw userError;
    }
    if (!userData) {
      throw new Error("Operacja na bazie danych nie zwróciła danych użytkownika.");
    }
    
    // Krok 6: Usuń wykorzystany token z bazy
    await supabase.from('password_tokens').delete().eq('nip', tokenData.nip);
    
    // Usuń hash hasła z odpowiedzi
    delete userData.password_hash;
    return new Response(JSON.stringify({ user: userData }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[set-new-password] KRYTYCZNY BŁĄD FUNKCJI:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hashSync } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, password } = await req.json();
    console.log(`[set-new-password] Otrzymano żądanie z tokenem: ${token}`);

    if (!token || !password || password.length < 6) {
      throw new Error('Nieprawidłowe dane wejściowe. Hasło musi mieć co najmniej 6 znaków.');
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashString = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`[set-new-password] Szukam w bazie tokena o hashu: ${hashString}`);

    const { data: tokenData, error: tokenError } = await supabase
      .from('password_tokens')
      .select('nip, expires_at')
      .eq('token_hash', hashString)
      .single();

    if (tokenError || !tokenData) {
      console.error('[set-new-password] Błąd odczytu tokena lub token nie znaleziony:', tokenError);
      throw new Error('Link jest nieprawidłowy lub został już wykorzystany.');
    }

    if (new Date(tokenData.expires_at) < new Date()) {
        throw new Error('Link wygasł. Poproś o nowy link do ustawienia hasła.');
    }
    
    console.log(`[set-new-password] Znaleziono token dla NIP: ${tokenData.nip}. Ustawiam hasło.`);
    
    // Tutaj zostawiamy Twoją logikę "upsert" z poprzednich wiadomości
    const { nip } = tokenData;
    const passwordHash = hashSync(password, 12);
    let finalUserData;
    const { data: updateData, error: updateError } = await supabase.from('users').update({ password_hash: passwordHash, is_first_login: false }).eq('nip', nip).select().single();
    if (updateData) {
        finalUserData = updateData;
    } else if (updateError && updateError.code === 'PGRST116') {
        const { data: insertData, error: insertError } = await supabase.from('users').insert({ nip, password_hash: passwordHash, is_first_login: false }).select().single();
        if (insertError) throw insertError;
        finalUserData = insertData;
    } else if (updateError) {
        throw updateError;
    }

    if (!finalUserData) {
        throw new Error("Operacja na bazie danych nie zwróciła danych użytkownika.");
    }
    
    await supabase.from('password_tokens').delete().eq('nip', tokenData.nip);
    console.log(`[set-new-password] Pomyślnie ustawiono hasło i usunięto token dla NIP: ${tokenData.nip}`);

    delete finalUserData.password_hash;
    return new Response(JSON.stringify({ user: finalUserData }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[set-new-password] KRYTYCZNY BŁĄD FUNKCJI:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})
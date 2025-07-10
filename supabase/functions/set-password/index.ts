// Plik: supabase/functions/set-password/index.ts
// WERSJA FINALNA - z ręczną obsługą upsert

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const saltRounds = 12;
    const passwordHash = hashSync(password, saltRounds);

    let finalUserData;

    if (loginMode === 'client') {
      // Ręczny "upsert" dla klienta. Najpierw próba aktualizacji.
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, is_first_login: false })
        .eq('nip', nip)
        .select()
        .single();

      if (updateData) {
        finalUserData = updateData;
      } else if (updateError && updateError.code === 'PGRST116') { // PGRST116 = "Not Found"
        // Jeśli nie znaleziono rekordu, tworzymy nowy.
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({ nip, password_hash: passwordHash, is_first_login: false })
          .select()
          .single();
        
        if (insertError) throw insertError;
        finalUserData = insertData;
      } else if (updateError) {
        // Inny błąd podczas update
        throw updateError;
      }
    } else {
      // Dla admina, tylko aktualizujemy istniejący wpis
      const { data, error } = await supabase
        .from('admin_users')
        .update({ password_hash: passwordHash })
        .eq('nip', nip)
        .select()
        .single();
      if (error) throw error;
      finalUserData = data;
    }

    if (!finalUserData) {
      throw new Error("Operacja na bazie danych nie zwróciła danych użytkownika.");
    }

    return new Response(JSON.stringify({ user: finalUserData }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Błąd serwera: ${error.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})

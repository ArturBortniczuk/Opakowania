import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { Resend } from 'https://esm.sh/resend@3.4.0';

const corsHeaders = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { nip } = await req.json();
    console.log(`[request-password-setup] Otrzymano żądanie dla NIP: ${nip}`);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('email')
      .eq('nip', nip)
      .maybeSingle();

    if (companyError) {
      console.error('[request-password-setup] Błąd przy zapytaniu o firmę:', companyError);
      throw new Error(`Błąd bazy danych: ${companyError.message}`);
    }

    if (companyData && companyData.email) {
      console.log(`[request-password-setup] Znaleziono firmę z e-mailem: ${companyData.email}`);
      const token = crypto.randomUUID();
      const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hashString = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      console.log(`[request-password-setup] Próba zapisu tokena do bazy. Hash: ${hashString}`);
      const { data: upsertData, error: upsertError } = await supabase
        .from('password_tokens')
        .upsert({ nip, token_hash: hashString, expires_at: expiresAt }, { onConflict: 'nip' })
        .select(); // WAŻNE: .select() zwraca dane po operacji

      // Logujemy co zwróciła baza danych
      console.log('[request-password-setup] Wynik operacji upsert (dane):', upsertData);
      console.error('[request-password-setup] Wynik operacji upsert (błąd):', upsertError);

      if (upsertError) {
        throw new Error(`Błąd zapisu tokenu: ${upsertError.message}`);
      }
      if (!upsertData || upsertData.length === 0) {
        throw new Error('Operacja upsert nie zwróciła danych. Sprawdź uprawnienia tabeli i poprawność klucza onConflict.');
      }

      console.log('[request-password-setup] Token zapisany. Wysyłanie e-maila...');
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const setupLink = `https://opakowania.vercel.app/?token=${token}`; // Zmieniony link na stronę główną z tokenem

      await resend.emails.send({
        from: 'opakowania@grupaeltron.pl', 
        to: companyData.email,
        subject: 'Grupa Eltron - Ustawienie/Reset hasła do systemu',
        html: `...`, // treść emaila bez zmian
      });
      console.log(`[request-password-setup] E-mail wysłany pomyślnie do ${companyData.email}`);
    } else {
        console.log(`[request-password-setup] Nie znaleziono firmy lub brakuje adresu email dla NIP: ${nip}`);
    }

    return new Response(JSON.stringify({ message: 'Jeśli podany NIP jest zarejestrowany w systemie, na przypisany do niego adres e-mail wysłaliśmy link do ustawienia hasła.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[request-password-setup] KRYTYCZNY BŁĄD FUNKCJI:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { Resend } from 'https://esm.sh/resend@3.4.0';

// Definiujemy nagłówki CORS, aby umożliwić komunikację z frontendem
const corsHeaders = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
};

serve(async (req) => {
  // Obsługa żądania OPTIONS (preflight) dla CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { nip } = await req.json();
    console.log(`[request-password-setup] Otrzymano żądanie dla NIP: ${nip}`);

    // Inicjalizacja klienta Supabase z kluczem serwisowym, aby mieć pełne uprawnienia
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Krok 1: Sprawdź, czy firma o podanym NIP-ie istnieje i ma przypisany e-mail
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('email') // Potrzebujemy tylko adresu e-mail
      .eq('nip', nip)
      .maybeSingle(); // .maybeSingle() nie zwróci błędu, jeśli nie znajdzie rekordu

    if (companyError) {
        console.error('[request-password-setup] Błąd przy zapytaniu o firmę:', companyError);
        throw new Error(`Błąd bazy danych: ${companyError.message}`);
    }

    // Krok 2: Jeśli firma istnieje i ma e-mail, kontynuuj proces
    if (companyData && companyData.email) {
      console.log(`[request-password-setup] Znaleziono firmę z e-mailem: ${companyData.email}`);
      
      // Generowanie unikalnego, bezpiecznego tokenu
      const token = crypto.randomUUID();
      // Haszowanie tokenu przed zapisem do bazy danych (ze względów bezpieczeństwa)
      const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hashString = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Ustawienie daty wygaśnięcia tokenu na 15 minut od teraz
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      console.log(`[request-password-setup] Próba zapisu tokena do bazy. Hash: ${hashString}`);
      
      // Krok 3: Zapisz zahaszowany token w bazie danych (operacja "upsert")
      const { data: upsertData, error: upsertError } = await supabase
        .from('password_tokens')
        .upsert({ nip, token_hash: hashString, expires_at: expiresAt }, { onConflict: 'nip' })
        .select(); // .select() jest kluczowe, aby operacja zwróciła dane (i błąd, jeśli wystąpi)

      if (upsertError) {
        console.error('[request-password-setup] Błąd zapisu tokenu:', upsertError);
        throw new Error(`Błąd zapisu tokenu: ${upsertError.message}`);
      }
      if (!upsertData || upsertData.length === 0) {
        // Ten błąd może wskazywać na problem z uprawnieniami RLS lub definicją tabeli
        throw new Error('Operacja zapisu tokenu nie powiodła się. Sprawdź uprawnienia tabeli.');
      }

      console.log('[request-password-setup] Token zapisany. Wysyłanie e-maila...');
      
      // Krok 4: Wyślij e-mail z linkiem zawierającym surowy (niehaszowany) token
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const setupLink = `https://opakowania.vercel.app/?token=${token}`; // Link do Twojej aplikacji na Vercel

      await resend.emails.send({
        from: 'opakowania@grupaeltron.pl', 
        to: companyData.email,
        subject: 'Grupa Eltron - Ustawienie/Reset hasła do systemu',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Witaj w systemie zarządzania bębnami Grupy Eltron!</h2>
            <p>Otrzymaliśmy prośbę o ustawienie lub zresetowanie hasła dla konta powiązanego z NIP: ${nip}.</p>
            <p>Aby kontynuować, kliknij w poniższy link. Link będzie aktywny przez <strong>15 minut</strong>.</p>
            <p style="margin: 20px 0;">
              <a href="${setupLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Ustaw lub zresetuj hasło</a>
            </p>
            <p>Jeśli nie prosiłeś/aś o tę operację, prosimy o zignorowanie tej wiadomości.</p>
            <hr>
            <p style="font-size: 12px; color: #6b7280;">Z pozdrowieniami,<br>Zespół Grupy Eltron</p>
          </div>
        `,
      });
      console.log(`[request-password-setup] E-mail wysłany pomyślnie do ${companyData.email}`);
    } else {
        console.log(`[request-password-setup] Nie znaleziono firmy lub brakuje adresu email dla NIP: ${nip}`);
    }

    // Zawsze zwracaj tę samą wiadomość, aby nie ujawniać, które NIP-y istnieją w bazie
    return new Response(JSON.stringify({ message: 'Jeśli podany NIP jest zarejestrowany w systemie, na przypisany do niego adres e-mail wysłaliśmy link do ustawienia hasła.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[request-password-setup] KRYTYCZNY BŁĄD FUNKCJI:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})

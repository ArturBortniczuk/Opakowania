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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('email') // Potrzebujemy tylko email
      .eq('nip', nip)
      .maybeSingle();

    if (companyError) {
        console.error('Błąd przy zapytaniu o firmę:', companyError);
        // Rzucamy błędem, aby nie wysyłać generycznej wiadomości
        throw new Error('Wystąpił błąd serwera przy sprawdzaniu NIP.');
    }

    // Warunek: wysyłamy maila, jeśli firma istnieje i ma email.
    if (companyData && companyData.email) {
      const token = crypto.randomUUID();
      const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hashString = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { error: upsertError } = await supabase.from('password_tokens').upsert({ nip, token_hash: hashString, expires_at: expiresAt }, { onConflict: 'nip' });

      if (upsertError) {
        console.error('Błąd przy zapisie tokenu:', upsertError);
        throw new Error('Nie udało się zapisać tokenu resetowania hasła.');
      }

      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const setupLink = `https://opakowania.vercel.app/set-password?token=${token}`; 
      
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
    }

    // Niezależnie od tego, czy mail został wysłany, zwracamy tę samą wiadomość, aby nie ujawniać, które NIPy są w systemie.
    return new Response(JSON.stringify({ message: 'Jeśli podany NIP jest zarejestrowany w systemie, na przypisany do niego adres e-mail wysłaliśmy link do ustawienia hasła.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Błąd w funkcji request-password-setup:", error);
    // W przypadku błędu, zwracamy generyczną wiadomość, aby uniknąć wycieku informacji o błędach wewnętrznych.
    return new Response(JSON.stringify({ error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})
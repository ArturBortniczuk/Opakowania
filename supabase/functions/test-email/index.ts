// Plik: supabase/functions/test-email/index.ts
// Opis: Prosta funkcja do testowania wysyłki e-maili przez Resend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from 'https://esm.sh/resend@3.4.0';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (_req) => {
  // Sprawdzamy, czy klucz API jest dostępny
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Brak klucza RESEND_API_KEY w sekretach funkcji." }), { status: 500 });
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: 'system@opakowania.grupaeltron.pl', // Użyj zweryfikowanej domeny
      to: 'a.bortniczuk@grupaeltron.pl', // <-- WAŻNE: Wpisz tutaj swój adres e-mail do testów!
      subject: 'Test wysyłki z Supabase i Resend',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h1>Wiadomość testowa</h1>
          <p>Jeśli widzisz tego e-maila, oznacza to, że Twoja konfiguracja Resend i klucz API w Supabase działają poprawnie.</p>
        </div>
      `,
    });

    if (error) {
      // Jeśli Resend zwróci błąd, pokaż go w odpowiedzi
      return new Response(JSON.stringify({ error: error }), { status: 400 });
    }

    // Jeśli wszystko się udało
    return new Response(JSON.stringify({ success: true, data: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})

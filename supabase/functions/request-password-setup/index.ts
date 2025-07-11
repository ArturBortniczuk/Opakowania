import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-control-allow-methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { nip } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // 1. Sprawdź, czy firma i jej email istnieją, oraz czy użytkownik nie ma już konta
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('email, users(nip)')
      .eq('nip', nip)
      .maybeSingle();

    // Zawsze zwracaj sukces, aby zapobiec enumeracji, ale nie rób nic, jeśli warunki nie są spełnione
    if (!companyError && companyData && companyData.email && companyData.users.length === 0) {
      // 2. Generuj bezpieczny token
      const token = crypto.randomUUID();
      const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hashString = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');

      // 3. Ustaw datę ważności (np. 15 minut)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // 4. Zapisz token w bazie
      await supabase.from('password_tokens').upsert({ nip, token_hash: hashString, expires_at: expiresAt }, { onConflict: 'nip' });

      // 5. Wyślij e-mail (TUTAJ MUSISZ ZINTEGROWAĆ USŁUGĘ EMAIL)
      // Przykład:
      const setupLink = `${Deno.env.get('REACT_APP_SITE_URL')}/set-password?token=${token}`;
      console.log(`WYSYŁANIE EMAIL DO: ${companyData.email} Z LINKIEM: ${setupLink}`);
      // await wyslijEmail(companyData.email, 'Ustaw hasło', `Link: ${setupLink}`);
    }

    // 6. ZAWSZE zwracaj ten sam komunikat
    return new Response(JSON.stringify({ message: 'Jeśli NIP jest poprawny, wysłano link.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ message: 'Jeśli NIP jest poprawny, wysłano link.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})
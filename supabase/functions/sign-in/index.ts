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
    const { nip, password } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    let userRecord;
    let table;
    let selectQuery;

    // Sprawdź najpierw, czy to logowanie administratora
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*, password_hash')
      .eq('nip', nip)
      .single();

    if (adminError && adminError.code !== 'PGRST116') { // Ignoruj błąd "brak wiersza"
      throw adminError;
    }

    if (adminData) {
      userRecord = adminData;
      table = 'admin_users';
    } else {
      // Jeśli nie admin, sprawdź jako klient
      const { data: clientData, error: clientError } = await supabase
        .from('users')
        .select('*, password_hash')
        .eq('nip', nip)
        .single();
      
      if (clientError) throw clientError;
      
      userRecord = clientData;
      table = 'users';
    }

    if (!userRecord || !userRecord.password_hash) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy NIP lub hasło nie zostało ustawione.' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
      });
    }

    const isValidPassword = await bcrypt.compare(password, userRecord.password_hash);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowe hasło.' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
      });
    }
    
    // Usuń hash hasła przed wysłaniem danych użytkownika z powrotem do klienta
    delete userRecord.password_hash;

    return new Response(JSON.stringify({ user: userRecord }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Błąd w funkcji sign-in:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
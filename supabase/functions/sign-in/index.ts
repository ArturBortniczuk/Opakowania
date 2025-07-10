// supabase/functions/sign-in/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Obsługa CORS preflight musi być jako pierwsza!
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parsowanie body
    const { nip, password, loginMode } = await req.json()

    // Walidacja wejścia
    if (!nip || !password || !loginMode) {
      return new Response(
        JSON.stringify({ error: 'Brak wymaganych pól: nip, password, loginMode' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Inicjalizacja klienta Supabase z kluczem service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Brak zmiennych środowiskowych SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ error: 'Błąd konfiguracji serwera' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Wybór tabeli na podstawie trybu logowania
    const table = loginMode === 'admin' ? 'admin_users' : 'users'

    // Pobranie użytkownika
    const { data: userData, error: userError } = await supabase
      .from(table)
      .select('*')
      .eq('nip', nip)
      .single()

    if (userError || !userData) {
      console.error('Błąd podczas pobierania użytkownika:', userError)
      return new Response(
        JSON.stringify({ error: `Nie znaleziono konta dla NIP: ${nip}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Sprawdzenie czy użytkownik ma hasło
    if (!userData.password_hash) {
      return new Response(
        JSON.stringify({ error: 'Użytkownik nie ma ustawionego hasła.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Weryfikacja hasła
    const isValidPassword = await bcrypt.compare(password, userData.password_hash)

    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe hasło.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Usuń hash hasła przed zwróceniem
    delete userData.password_hash

    // Zaktualizuj ostatnie logowanie
    await supabase
      .from(table)
      .update({ last_login: new Date().toISOString() })
      .eq('nip', nip)

    return new Response(
      JSON.stringify({ user: userData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Błąd w funkcji sign-in:', error)
    return new Response(
      JSON.stringify({ error: `Wystąpił wewnętrzny błąd serwera: ${error.message}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
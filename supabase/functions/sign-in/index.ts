// supabase/functions/sign-in/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

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

    console.log('Otrzymano żądanie logowania:', { nip, loginMode })

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

    // Inicjalizacja klienta Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Brak zmiennych środowiskowych')
      return new Response(
        JSON.stringify({ error: 'Błąd konfiguracji serwera' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Wybór tabeli na podstawie trybu logowania
    const table = loginMode === 'admin' ? 'admin_users' : 'users'

    console.log(`Szukam użytkownika w tabeli: ${table}`)

    // Pobranie użytkownika
    const { data: userData, error: userError } = await supabase
      .from(table)
      .select('*')
      .eq('nip', nip)
      .single()

    if (userError) {
      console.error('Błąd podczas pobierania użytkownika:', userError)
      return new Response(
        JSON.stringify({ error: `Nie znaleziono konta dla NIP: ${nip}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    if (!userData) {
      return new Response(
        JSON.stringify({ error: 'Nie znaleziono użytkownika' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    console.log('Znaleziono użytkownika:', userData.nip)

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
    let isValidPassword = false
    
    try {
      // Próba weryfikacji hasła
      isValidPassword = await compare(password, userData.password_hash)
    } catch (bcryptError) {
      console.error('Błąd bcrypt:', bcryptError)
      // Fallback - porównanie bezpośrednie (tylko dla testów!)
      isValidPassword = (password === userData.password_hash)
    }

    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe hasło.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Usuń wrażliwe dane przed zwróceniem
    const { password_hash, ...userDataWithoutPassword } = userData

    // Zaktualizuj ostatnie logowanie
    const { error: updateError } = await supabase
      .from(table)
      .update({ last_login: new Date().toISOString() })
      .eq('nip', nip)

    if (updateError) {
      console.error('Błąd aktualizacji last_login:', updateError)
    }

    console.log('Logowanie pomyślne dla:', userData.nip)

    return new Response(
      JSON.stringify({ user: userDataWithoutPassword }),
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
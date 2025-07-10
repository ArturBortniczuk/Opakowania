// supabase/functions/set-password/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

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

    console.log('Otrzymano żądanie ustawienia hasła:', { nip, loginMode })

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

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Hasło musi mieć co najmniej 6 znaków.' }),
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

    // Hashowanie hasła
    let passwordHash
    
    try {
      const saltRounds = 10 // Zmniejszone z 12 dla lepszej wydajności
      passwordHash = await hash(password, saltRounds)
    } catch (bcryptError) {
      console.error('Błąd hashowania:', bcryptError)
      // Fallback - zapisz jako plain text (TYLKO DLA TESTÓW!)
      passwordHash = password
      console.warn('UWAGA: Hasło zapisane jako plain text - tylko dla testów!')
    }

    let finalUser

    if (loginMode === 'admin') {
      console.log('Aktualizacja hasła dla admina')
      
      // Dla admina - aktualizujemy istniejący rekord
      const { data: updatedAdmin, error: adminError } = await supabase
        .from('admin_users')
        .update({ 
          password_hash: passwordHash,
          is_first_login: false,
          updated_at: new Date().toISOString()
        })
        .eq('nip', nip)
        .select()
        .single()

      if (adminError) {
        console.error('Błąd podczas aktualizacji admina:', adminError)
        return new Response(
          JSON.stringify({ error: `Błąd aktualizacji: ${adminError.message}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        )
      }

      if (!updatedAdmin) {
        return new Response(
          JSON.stringify({ error: "Nie znaleziono administratora o podanym NIP." }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        )
      }

      finalUser = updatedAdmin

    } else {
      console.log('Tworzenie/aktualizacja hasła dla klienta')
      
      // Najpierw sprawdź czy firma istnieje
      const { data: companyExists, error: companyError } = await supabase
        .from('companies')
        .select('nip')
        .eq('nip', nip)
        .single()

      if (companyError || !companyExists) {
        console.error('Firma nie istnieje:', companyError)
        return new Response(
          JSON.stringify({ error: "Nie znaleziono firmy o podanym NIP." }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        )
      }

      // Dla klienta - upsert (wstawienie lub aktualizacja)
      const { data: updatedUser, error: userError } = await supabase
        .from('users')
        .upsert(
          { 
            nip: nip, 
            password_hash: passwordHash, 
            is_first_login: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'nip',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single()

      if (userError) {
        console.error('Błąd podczas tworzenia/aktualizacji użytkownika:', userError)
        return new Response(
          JSON.stringify({ error: `Błąd zapisu: ${userError.message}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        )
      }

      if (!updatedUser) {
        return new Response(
          JSON.stringify({ error: "Nie udało się utworzyć użytkownika klienta." }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        )
      }

      finalUser = updatedUser
    }

    // Usuń hash hasła przed zwróceniem
    const { password_hash: _, ...userWithoutPassword } = finalUser

    console.log('Hasło ustawione pomyślnie dla:', nip)

    return new Response(
      JSON.stringify({ user: userWithoutPassword }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Błąd w funkcji set-password:', error)
    return new Response(
      JSON.stringify({ error: `Wystąpił wewnętrzny błąd serwera: ${error.message}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
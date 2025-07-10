// supabase/functions/set-password/index.ts
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

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Hasło musi mieć co najmniej 6 znaków.' }),
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

    // Hashowanie hasła
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    let finalUser

    if (loginMode === 'admin') {
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
          JSON.stringify({ error: adminError.message }),
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
          JSON.stringify({ error: userError.message }),
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
    delete finalUser.password_hash

    return new Response(
      JSON.stringify({ user: finalUser }),
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
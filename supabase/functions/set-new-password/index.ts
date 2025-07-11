import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hashSync } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token, password } = await req.json();
    if (!token || !password || password.length < 6) {
      throw new Error('Nieprawidłowe dane. Hasło musi mieć co najmniej 6 znaków.');
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashString = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: tokenData, error: tokenError } = await supabase
      .from('password_tokens')
      .select('nip, expires_at')
      .eq('token_hash', hashString)
      .single();

    if (tokenError || !tokenData || new Date(tokenData.expires_at) < new Date()) {
      throw new Error('Link jest nieprawidłowy lub wygasł.');
    }

    const passwordHash = hashSync(password, 12);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({ nip: tokenData.nip, password_hash: passwordHash, is_first_login: false })
      .select()
      .single();
    
    if (userError) throw userError;

    await supabase.from('password_tokens').delete().eq('nip', tokenData.nip);

    delete userData.password_hash;
    return new Response(JSON.stringify({ user: userData }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})
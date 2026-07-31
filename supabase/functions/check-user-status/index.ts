// supabase/functions/check-user-status/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { nip, loginMode } = await req.json();

    if (!nip || typeof nip !== 'string') {
      return new Response(JSON.stringify({ exists: false }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const table = loginMode === 'admin' ? 'admin_users' : 'companies';
    const { data, error } = await supabase.from(table).select('name').eq('nip', nip.trim()).maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ exists: false }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Sprawdzamy, czy użytkownik z tym NIP-em istnieje w public.profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('nip', nip.trim())
      .maybeSingle();

    const hasPassword = !!profile;

    return new Response(JSON.stringify({
      exists: true,
      hasPassword: hasPassword,
      userData: { name: data.name }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

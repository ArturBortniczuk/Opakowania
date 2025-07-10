// supabase/functions/check-user-status/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { nip, loginMode } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const table = loginMode === 'admin' ? 'admin_users' : 'companies';
    const select_query = loginMode === 'admin' ? 'name, password_hash' : 'name, email, users(password_hash)';

    const { data, error } = await supabase.from(table).select(select_query).eq('nip', nip).maybeSingle();

    if (error || !data) return new Response(JSON.stringify({ exists: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const hasPassword = loginMode === 'admin' ? !!data.password_hash : !!(data.users && data.users.length > 0 && data.users[0].password_hash);

    return new Response(JSON.stringify({ exists: true, hasPassword, userData: { name: data.name, email: data.email } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})

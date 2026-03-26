import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pobafitamzkzcfptuaqj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SECRET',
  { auth: { persistSession: false } }
);

async function test() {
  const { data, error } = await supabase.from('companies').upsert([{ nip: '637-21-59-473', name: 'Test' }]);
  console.log("Upsert result:", { data, error });
}
test();

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testTrigger() {
  const { data, error } = await supabase.rpc('test_query', { query: 'SELECT (NULL::jsonb)->>\'name\'' });
  console.log(error);
}

testTrigger();

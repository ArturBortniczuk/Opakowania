const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  const { data, error } = await supabase.rpc('test_query', { query: 'SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = \'profiles_role_check\'' });
  console.log('Result:', error || data);
}

checkConstraints();

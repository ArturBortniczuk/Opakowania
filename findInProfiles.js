const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findInProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').like('email', '%grupaeltron.pl%');
  console.log('Profiles error:', error);
  console.log('Profiles found:', data.filter(p => p.email.includes('baginski') || p.email.includes('pawlak') || p.email.includes('gryka')));
}

findInProfiles();

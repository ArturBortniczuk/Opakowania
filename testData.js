const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testData() {
  const { data, error } = await supabase.from('drums').select('status, data_wydania').limit(20);
  console.log('Sample Data:', error || data);
  
  const { data: distinctStatuses } = await supabase.from('drums').select('status').not('status', 'is', null);
  const statuses = [...new Set(distinctStatuses?.map(d => d.status) || [])];
  console.log('Distinct statuses:', statuses);
}

testData();

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWsparcie() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'testdummy3@grupaeltron.pl',
    password: 'Magazyn2026!',
    email_confirm: true,
    user_metadata: {
      name: 'Test 3',
      role: 'Wsparcie',
      status: 'approved'
    }
  });
  console.log('Result:', error || data);
}

testWsparcie();

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'testdummy2@grupaeltron.pl',
    password: 'Magazyn2026!',
    email_confirm: true,
    user_metadata: {
      name: 'Test 2',
      role: 'client',
      status: 'approved'
    }
  });
  console.log('Result:', error || data);
}

test();

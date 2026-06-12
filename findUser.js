const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findUser() {
  const { data, error } = await supabase.auth.admin.listUsers();
  const users = data.users.filter(u => u.email.includes('baginski') || u.email.includes('pawlak'));
  console.log('Found users:', users.map(u => u.email));
}

findUser();

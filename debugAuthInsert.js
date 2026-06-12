const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAuthInsert() {
  const { data, error } = await supabase.from('users').insert([{
    id: '11111111-1111-1111-1111-111111111111',
    email: 'm.baginski2@grupaeltron.pl',
    raw_app_meta_data: { provider: 'email', providers: ['email'] },
    raw_user_meta_data: {
      name: 'Mateusz Bagiński',
      role: 'Specjalista',
      status: 'approved',
      department: 'Magazyn'
    },
    aud: 'authenticated',
    role: 'authenticated'
  }]);
  
  console.log('Result:', error || 'Success');
}

debugAuthInsert();

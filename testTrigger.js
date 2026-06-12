const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('profiles').insert([
    {
      id: '00000000-0000-0000-0000-000000000000', // Używamy jakiegoś losowego UUID lub po prostu pustego, co rzuci błąd FK, ale sprawdzi inne ograniczenia
      email: 'test@test.pl',
      name: 'Test',
      phone: '',
      company_name: '',
      nip: '',
      role: 'Specjalista',
      status: 'approved',
      rodo_accepted: false
    }
  ]);
  
  console.log('Result:', error || 'Success');
}

testInsert();

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const emailsToFix = [
  'm.baginski@grupaeltron.pl',
  'm.pawlak@grupaeltron.pl',
  'm.borkowski@grupaeltron.pl',
  'k.gryka@grupaeltron.pl',
  'p.opolski@grupaeltron.pl',
  'mateusz.klewinowski@grupaeltron.pl'
];

async function fixPasswords() {
  // 1. Pobierz ID użytkowników z public.profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', emailsToFix);
    
  if (profileError) {
    console.error('Błąd pobierania profili:', profileError);
    return;
  }
  
  console.log(`Znaleziono ${profiles.length} profili.`);
  
  for (const profile of profiles) {
    console.log(`Aktualizuję hasło dla ${profile.email} (ID: ${profile.id})...`);
    const { data, error } = await supabase.auth.admin.updateUserById(profile.id, {
      password: 'Magazyn2026!',
      email_confirm: true
    });
    
    if (error) {
      console.error(`Błąd przy aktualizacji ${profile.email}:`, error.message);
    } else {
      console.log(`Pomyślnie zaktualizowano hasło dla ${profile.email}!`);
    }
  }
}

fixPasswords();

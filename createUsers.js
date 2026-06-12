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

const users = [
  { email: 'm.baginski@grupaeltron.pl', name: 'Mateusz Bagiński' },
  { email: 'm.pawlak@grupaeltron.pl', name: 'Marcin Pawlak' },
  { email: 'm.borkowski@grupaeltron.pl', name: 'Michał Borkowski' },
  { email: 'k.gryka@grupaeltron.pl', name: 'Kamil Gryka' },
  { email: 'p.opolski@grupaeltron.pl', name: 'Paweł Opolski' },
  { email: 'mateusz.klewinowski@grupaeltron.pl', name: 'Mateusz Klewinowski' }
];

async function main() {
  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'Magazyn2026!',
      email_confirm: true,
      user_metadata: {
        name: user.name,
        role: 'Wsparcie',
        status: 'approved',
        department: 'Magazyn'
      }
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`${user.email} już istnieje. Aktualizuję hasło i metadane...`);
        // Aktualizacja użytkownika
        
        // Najpierw znajdźmy usera
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (usersData && usersData.users) {
          const existingUser = usersData.users.find(u => u.email === user.email);
          if (existingUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { 
                password: 'Magazyn2026!',
                user_metadata: {
                  ...existingUser.user_metadata,
                  role: 'Wsparcie',
                  department: 'Magazyn'
                }
              }
            );
            if (updateError) {
              console.error(`Błąd przy aktualizacji ${user.email}:`, updateError.message);
            } else {
              console.log(`Zaktualizowano ${user.email} na hasło Magazyn2026!`);
            }
          }
        }
      } else {
        console.error(`Błąd przy tworzeniu ${user.email}:`, error.message);
      }
    } else {
      console.log(`Pomyślnie utworzono ${user.email} (ID: ${data.user.id})`);
    }
  }
}

main();

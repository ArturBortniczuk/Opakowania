import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Wczytywanie zmiennych z .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

let envLocal = '';
try {
  envLocal = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Nie znaleziono pliku .env.local w głównym folderze projektu.');
  process.exit(1);
}

const supabaseUrlMatch = envLocal.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
const supabaseServiceKeyMatch = envLocal.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m);

if (!supabaseUrlMatch || !supabaseServiceKeyMatch) {
  console.error('Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local');
  process.exit(1);
}

const supabaseUrl = supabaseUrlMatch[1].trim();
const supabaseServiceKey = supabaseServiceKeyMatch[1].trim();

// Inicjalizacja klienta Supabase z prawami Admina (Service Role)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAccounts() {
  console.log('Pobieranie listy handlowców z tabeli salespeople...');
  const { data: salespeople, error: fetchError } = await supabaseAdmin
    .from('salespeople')
    .select('*');

  if (fetchError) {
    console.error('Błąd pobierania handlowców:', fetchError);
    return;
  }

  console.log(`Znaleziono ${salespeople.length} handlowców. Rozpoczynam tworzenie kont...`);
  
  const defaultPassword = 'EltronUser2026!';

  for (const person of salespeople) {
    if (!person.email) {
      console.log(`Pominięto: ${person.name} (Brak adresu e-mail)`);
      continue;
    }

    console.log(`Tworzenie konta dla: ${person.email}...`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: person.email,
      password: defaultPassword,
      email_confirm: true, // Od razu potwierdzamy e-mail
      user_metadata: {
        name: person.name,
        phone: person.phone || '',
        role: person.role || 'client',
        status: 'approved', // Od razu zatwierdzone konto
        rodoAccepted: true
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(` -> Konto ${person.email} już istnieje w systemie. Aktualizacja profilu...`);
        // Jeśli konto istnieje, aktualizujemy jego profil
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const user = existingUser.users.find(u => u.email === person.email);
        if (user) {
           await supabaseAdmin.from('profiles').update({
             role: person.role,
             status: 'approved'
           }).eq('id', user.id);
        }
      } else {
        console.error(` -> Błąd tworzenia ${person.email}:`, authError.message);
      }
    } else {
      console.log(` -> Sukces! Utworzono konto dla ${person.name} (${person.role})`);
    }
  }

  console.log('\n✅ Zakończono proces tworzenia kont handlowców!');
  console.log(`Wszyscy mają domyślne hasło: ${defaultPassword}`);
  console.log('Mogą się już zalogować i ewentualnie zmienić hasło w ustawieniach.');
}

createAccounts();

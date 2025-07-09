// migrations/001_initial_migration.js
// Wersja 2: Zaktualizowana struktura baz danych pod codzienny import danych.

const { sql } = require('@vercel/postgres');

// Przykładowe dane do wstępnego wypełnienia bazy
const sampleCompanies = [
  { nip: '1234567890', name: 'Firma Testowa ABC Sp. z o.o.', email: 'kontakt@abc.pl', phone: '+48 123 456 789' },
  { nip: '9876543210', name: 'Testowe Przedsiębiorstwo XYZ', email: 'biuro@xyz.pl', phone: '+48 987 654 321' },
];

const sampleAdmins = [
  {
    nip: '0000000000',
    username: 'admin',
    name: 'Administrator Systemu',
    email: 'admin@grupaeltron.pl',
    role: 'admin',
  },
];

async function createTables() {
  console.log('Tworzenie tabel w wersji 2...');

  try {
    // Tabela 1: Firmy (kartoteka klientów, nie będzie czyszczona)
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        nip VARCHAR(10) PRIMARY KEY,
        name TEXT NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabela 2: Użytkownicy (przechowuje tylko dane logowania, nie będzie czyszczona)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL REFERENCES companies(nip) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        is_first_login BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabela 3: Administratorzy (nie będzie czyszczona)
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        password_hash TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabela 4: Bębny (będzie codziennie czyszczona i wypełniana na nowo)
    await sql`
      CREATE TABLE IF NOT EXISTS drums (
        id SERIAL PRIMARY KEY,
        kod_bebna VARCHAR(50) NOT NULL,
        nazwa TEXT,
        cecha TEXT,
        data_zwrotu_do_dostawcy DATE,
        kon_dostawca TEXT,
        pelna_nazwa_kontrahenta TEXT,
        nip VARCHAR(10) REFERENCES companies(nip) ON DELETE SET NULL,
        typ_dok VARCHAR(50),
        nr_dokumentupz VARCHAR(100),
        data_przyjecia_na_stan DATE,
        kontrahent TEXT,
        status VARCHAR(50),
        data_wydania DATE,
        UNIQUE (kod_bebna, nip) -- Klucz unikalny dla bębna w ramach klienta
      );
    `;

    // Tabela 5: Zgłoszenia zwrotów (nie będzie czyszczona)
    await sql`
      CREATE TABLE IF NOT EXISTS return_requests (
        id SERIAL PRIMARY KEY,
        user_nip VARCHAR(10) REFERENCES companies(nip) ON DELETE SET NULL,
        company_name TEXT NOT NULL,
        street TEXT NOT NULL,
        postal_code VARCHAR(10) NOT NULL,
        city VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        loading_hours VARCHAR(50) NOT NULL,
        available_equipment TEXT,
        notes TEXT,
        collection_date DATE NOT NULL,
        selected_drums JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'Pending',
        priority VARCHAR(10) DEFAULT 'Normal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Tabela 6: Niestandardowe terminy zwrotu (nie będzie czyszczona)
    await sql`
      CREATE TABLE IF NOT EXISTS custom_return_periods (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL REFERENCES companies(nip) ON DELETE CASCADE,
        return_period_days INTEGER NOT NULL DEFAULT 85,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('✅ Tabele w wersji 2 utworzone pomyślnie.');

  } catch (error) {
    console.error('❌ Błąd podczas tworzenia tabel v2:', error);
    throw error;
  }
}

async function seedInitialData() {
  console.log('Wypełnianie danymi początkowymi...');
  
  try {
    // Wstaw przykładowe firmy
    for (const company of sampleCompanies) {
      await sql`
        INSERT INTO companies (nip, name, email, phone)
        VALUES (${company.nip}, ${company.name}, ${company.email}, ${company.phone})
        ON CONFLICT (nip) DO NOTHING;
      `;
    }
    console.log(`✅ Wstawiono przykładowe firmy.`);

    // Wstaw administratorów
    for (const admin of sampleAdmins) {
      await sql`
        INSERT INTO admin_users (nip, username, name, email, role)
        VALUES (${admin.nip}, ${admin.username}, ${admin.name}, ${admin.email}, ${admin.role})
        ON CONFLICT (nip) DO NOTHING;
      `;
    }
    console.log(`✅ Wstawiono konta administratorów.`);
    
    console.log('🎉 Wypełnianie danymi zakończone!');
    
  } catch (error) {
    console.error('❌ Błąd podczas wypełniania danymi:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Rozpoczynanie migracji do v2...');
  try {
    await createTables();
    await seedInitialData();
    console.log('✅ Migracja do v2 zakończona pomyślnie!');
  } catch (error) {
    console.error('❌ Migracja v2 nie powiodła się:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

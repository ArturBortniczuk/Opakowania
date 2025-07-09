// migrations/001_initial_migration.js
const { sql } = require('@vercel/postgres');

// Dla lokalnego testowania - dane przykładowe
const sampleCompanies = [
  { nip: '1234567890', name: 'Firma ABC Sp. z o.o.', email: 'kontakt@abc.pl', phone: '+48 123 456 789' },
  { nip: '9876543210', name: 'XYZ Manufacturing', email: 'biuro@xyz.pl', phone: '+48 987 654 321' },
  { nip: '5555666677', name: 'Przemysł Beta SA', email: 'info@beta.pl', phone: '+48 555 666 777' }
];

const sampleAdmins = [
  {
    nip: '0000000000',
    username: 'admin',
    name: 'Administrator Systemu',
    email: 'admin@grupaeltron.pl',
    role: 'admin',
    permissions: { all: true }
  },
  {
    nip: '1111111111',
    username: 'supervisor',
    name: 'Supervisor',
    email: 'supervisor@grupaeltron.pl',
    role: 'supervisor',
    permissions: { view: true, edit: true }
  }
];

async function createTables() {
  console.log('Creating database tables...');
  
  try {
    // Tabela companies (firmy)
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        status VARCHAR(20) DEFAULT 'Aktywny',
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabela drums (bębny)
    await sql`
      CREATE TABLE IF NOT EXISTS drums (
        id SERIAL PRIMARY KEY,
        kod_bebna VARCHAR(50) UNIQUE NOT NULL,
        nazwa TEXT NOT NULL,
        cecha TEXT,
        data_zwrotu_do_dostawcy DATE,
        kon_dostawca TEXT,
        nip VARCHAR(10) REFERENCES companies(nip),
        typ_dok VARCHAR(50),
        nr_dokumentupz VARCHAR(100),
        data_przyjecia_na_stan DATE,
        kontrahent TEXT,
        status VARCHAR(20) DEFAULT 'Aktywny',
        data_wydania DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabela users (hasła użytkowników)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL REFERENCES companies(nip),
        password_hash TEXT NOT NULL,
        is_first_login BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabela return_requests (zgłoszenia zwrotów)
    await sql`
      CREATE TABLE IF NOT EXISTS return_requests (
        id SERIAL PRIMARY KEY,
        user_nip VARCHAR(10) REFERENCES companies(nip),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabela custom_return_periods (niestandardowe terminy)
    await sql`
      CREATE TABLE IF NOT EXISTS custom_return_periods (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE REFERENCES companies(nip),
        return_period_days INTEGER NOT NULL DEFAULT 85,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabela admin_users (administratorzy)
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        nip VARCHAR(10) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        permissions JSONB,
        password_hash TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ Tables created successfully');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

async function seedBasicData() {
  console.log('Seeding basic data...');
  
  try {
    // 1. Wstaw przykładowe firmy
    console.log('Inserting sample companies...');
    
    for (const company of sampleCompanies) {
      await sql`
        INSERT INTO companies (nip, name, email, phone, address, status, last_activity)
        VALUES (
          ${company.nip},
          ${company.name},
          ${company.email},
          ${company.phone},
          'ul. Przykładowa 1, 00-000 Warszawa',
          'Aktywny',
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (nip) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone
      `;
    }

    console.log(`✅ Inserted ${sampleCompanies.length} companies`);

    // 2. Wstaw przykładowe bębny
    console.log('Inserting sample drums...');
    
    const sampleDrums = [
      {
        kod_bebna: 'BEB001',
        nazwa: 'Bęben stalowy 200L',
        nip: '1234567890',
        data_zwrotu_do_dostawcy: '2024-06-15',
        data_wydania: '2024-01-15'
      },
      {
        kod_bebna: 'BEB002', 
        nazwa: 'Bęben plastikowy 100L',
        nip: '1234567890',
        data_zwrotu_do_dostawcy: '2024-07-01',
        data_wydania: '2024-02-01'
      },
      {
        kod_bebna: 'BEB003',
        nazwa: 'Bęben aluminiowy 150L',
        nip: '9876543210',
        data_zwrotu_do_dostawcy: '2024-05-30',
        data_wydania: '2024-01-01'
      }
    ];

    for (const drum of sampleDrums) {
      await sql`
        INSERT INTO drums (
          kod_bebna, nazwa, nip, data_zwrotu_do_dostawcy, 
          data_wydania, kon_dostawca, status
        ) VALUES (
          ${drum.kod_bebna},
          ${drum.nazwa},
          ${drum.nip},
          ${drum.data_zwrotu_do_dostawcy},
          ${drum.data_wydania},
          'Dostawca XYZ',
          'Aktywny'
        )
        ON CONFLICT (kod_bebna) DO UPDATE SET
          nazwa = EXCLUDED.nazwa
      `;
    }

    console.log(`✅ Inserted ${sampleDrums.length} drums`);

    // 3. Wstaw administratorów
    console.log('Inserting admin users...');
    
    for (const admin of sampleAdmins) {
      await sql`
        INSERT INTO admin_users (nip, username, name, email, role, permissions, is_active)
        VALUES (
          ${admin.nip},
          ${admin.username},
          ${admin.name},
          ${admin.email},
          ${admin.role},
          ${JSON.stringify(admin.permissions)},
          true
        )
        ON CONFLICT (nip) DO UPDATE SET
          username = EXCLUDED.username,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions
      `;
    }

    console.log(`✅ Inserted ${sampleAdmins.length} admin users`);
    console.log('🎉 Basic data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Funkcja główna migracji
async function runMigration() {
  console.log('🚀 Starting database migration...');
  
  try {
    await createTables();
    await seedBasicData();
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Test accounts created:');
    console.log('🔑 Admin: NIP 0000000000 (set password on first login)');
    console.log('🔑 Supervisor: NIP 1111111111 (set password on first login)');
    console.log('👤 Client: NIP 1234567890 (set password on first login)');
    console.log('👤 Client: NIP 9876543210 (set password on first login)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Export funkcji
module.exports = {
  createTables,
  seedBasicData,
  runMigration
};

// Uruchom migrację jeśli plik jest wykonywany bezpośrednio
if (require.main === module) {
  runMigration();
}
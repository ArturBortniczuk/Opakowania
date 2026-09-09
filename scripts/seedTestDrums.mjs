import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { TEST_DRUMS } from './testDrumsData.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvVariables() {
  const possibleEnvPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '.env.local')
  ];

  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          if (value) process.env[key] = value;
        }
      });
    }
  }
}

async function seed() {
  loadEnvVariables();
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Brakuje klucza SUPABASE_SERVICE_ROLE_KEY w .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  console.log('🧹 Usuwanie istniejących bębnów dla konta Firma Testowa (NIP: 0000000000)...');
  await supabase.from('drums').delete().eq('nip', '0000000000');

  console.log(`📥 Wstawianie ${TEST_DRUMS.length} bębnów testowych...`);
  const { data, error } = await supabase.from('drums').insert(TEST_DRUMS).select('id, cecha, rozmiar_bebna, status, data_zwrotu_do_dostawcy');

  if (error) {
    console.error('❌ Błąd podczas wstawiania bębnów testowych:', error.message);
    process.exit(1);
  }

  console.log('🎉 Pomyślnie dodano bębny testowe:');
  data.forEach(d => {
    console.log(`   - Cecha: ${d.cecha} | Rozmiar: ${d.rozmiar_bebna} | Status: ${d.status} | Zwrot: ${d.data_zwrotu_do_dostawcy || 'Brak'}`);
  });
}

seed();

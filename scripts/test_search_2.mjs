import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// We must extract the actual Anon key from .env.local to reproduce accurately
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env.local');

let anonKey = '';
let url = 'https://pobafitamzkzcfptuaqj.supabase.co';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*REACT_APP_SUPABASE_ANON_KEY\s*=\s*(.*)\s*$/);
    if (match) {
      let value = match[1] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      anonKey = value.trim();
    }
  });
}

if (!anonKey) {
  console.log("NO ANON KEY FOUND!");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function run() {
  const search = "EP-10-0112-20";
  const safeSearch = `%${search}%`;
  console.log("safeSearch:", safeSearch);
  
  let query = supabase
    .from('drums')
    .select(`*, companies (name)`, { count: 'exact' });
    
  query = query.or(`cecha.ilike.${safeSearch},kod_bebna.ilike.${safeSearch},nazwa.ilike.${safeSearch},pelna_nazwa_kontrahenta.ilike.${safeSearch},adres_dostawy.ilike.${safeSearch},nazwa_punktu_dostawy.ilike.${safeSearch},numer_faktury.ilike.${safeSearch}`);

  const { data, error, count } = await query;
  if(error) {
    console.log("SUPABASE ERROR:", error);
  } else {
    console.log("COUNT:", count);
    console.log("DATA LENGTH:", data ? data.length : 0);
    if (data && data.length > 0) {
      console.log("First matched item:", data[0].kod_bebna, data[0].cecha);
    }
  }
}
run();

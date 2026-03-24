import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Funkcja wczytująca zmienne (.env.local)
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
          if (!process.env[key]) process.env[key] = value;
        }
      });
      break;
    }
  }
}

function convertPolishDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

async function runLocalSync() {
  console.log('--- START LOKALNEGO IMPORTU ---');
  loadEnvVariables();

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // UŻYWAMY KLUCZA SERWISOWEGO ABY MIEĆ UPRAWNIENIA ADMINISTRATORA (OMINIĘCIE RLS I LIMITÓW)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ BŁĄD: Brakuje klucza SUPABASE_SERVICE_ROLE_KEY w zmiennych środowiskowych!');
    console.log('Dodaj go do pliku .env.local jako SUPABASE_SERVICE_ROLE_KEY=Twój_sekretny_klucz');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const networkFilePath = '\\\\192.168.3.200\\Strona opakowaniowa\\zestawienie.csv';

  if (!fs.existsSync(networkFilePath)) {
    console.error(`❌ BŁĄD: Plik nie istnieje pod ścieżką: ${networkFilePath}`);
    process.exit(1);
  }

  try {
    console.log(`[1/5] Odczytywanie pliku ${networkFilePath}...`);
    const csvContent = fs.readFileSync(networkFilePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length <= 1) {
      throw new Error('Plik CSV jest pusty lub ma tylko nagłówki.');
    }

    console.log(`[2/5] Parsowanie ${lines.length} wierszy... (wykorzystując moc lokalnego komputera)`);
    const headers = parseCSVLine(lines[0]);
    const dataLines = lines.slice(1);
    
    const processedData = [];
    let skippedRows = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const values = parseCSVLine(dataLines[i]);
      if (values.length !== headers.length) {
        skippedRows++;
        continue;
      }
      
      const record = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        if (header.toLowerCase().includes('data') || header.toLowerCase().includes('date')) {
          value = convertPolishDate(value);
        }
        const headerLower = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        switch (headerLower) {
          case 'kod_bebna': record.KOD_BEBNA = value; break;
          case 'nazwa': record.NAZWA = value; break;
          case 'cecha': record.CECHA = value; break;
          case 'nip': record.NIP = value; break;
          case 'data_zwrotu_do_dostawcy': record.DATA_ZWROTU_DO_DOSTAWCY = value; break;
          case 'kon_dostawca': record.KON_DOSTAWCA = value; break;
          case 'pelna_nazwa_kontrahenta': record.PELNA_NAZWA_KONTRAHENTA = value; break;
          case 'typ_dok': record.TYP_DOK = value; break;
          case 'nr_dokumentu': record.NR_DOKUMENTU = value; break;
          case 'upz': record.UPZ = value; break;
          case 'data_przyjecia_na_stan': record['Data przyjęcia na stan'] = value; break;
          case 'kontrahent': record.KONTRAHENT = value; break;
          case 'status': record.STATUS = value; break;
          case 'data_wydania': record.DATA_WYDANIA = value; break;
          default: record[header] = value;
        }
      });

      if (!record.KOD_BEBNA || !record.NIP) {
        skippedRows++;
        continue;
      }
      processedData.push(record);
    }
    console.log(`[3/5] Plik zdekodowany pomyślnie. Przygotowano ${processedData.length} rekordów (pominięto ${skippedRows}).`);

    console.log(`[4/5] 🗑️ Czyszczenie starej tabeli drums w Supabase...`);
    const { error: deleteError } = await supabase.from('drums').delete().neq('id', 0);
    if (deleteError) {
      throw new Error(`Błąd podczas usuwania starych danych: ${deleteError.message}`);
    }

    console.log(`[5/5] 📤 Wstawianie nowych rekordów w paczkach po 1000... (To omija limity serwera!)`);
    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize);
      process.stdout.write(`       Paczka ${Math.floor(i/batchSize) + 1}... `);
      const { error: insertError, count } = await supabase.from('drums').insert(batch).select('id', { count: 'exact' });
      if (insertError) {
        throw new Error(`Błąd w paczce wstawiania: ${insertError.message}`);
      }
      totalInserted += count || batch.length;
      console.log(`✅ Zrobione!`);
    }

    console.log(`\n🎉 SUKCES! Bezpiecznie przetworzono na lokalnym komputerze i wstawiono do chmury!`);
    console.log(`Zaimportowano łącznie: ${totalInserted} bębnów.`);

  } catch (error) {
    console.error('❌ WYSTĄPIŁ BŁĄD:', error.message);
    process.exit(1);
  }
}

runLocalSync();

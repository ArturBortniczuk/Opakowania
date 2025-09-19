// supabase/functions/clever-action/index.ts
// ZASTĄP obecny kod funkcji tym kodem
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
function convertPolishDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
Deno.serve(async (req)=>{
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] ${req.method} ${req.url} - Start`);
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] OPTIONS request - returning CORS headers`);
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log(`[${requestId}] 🚀 Rozpoczynanie importu CSV...`);
    // Sprawdź środowiskowe
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log(`[${requestId}] 🔧 Środowisko:`, {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: serviceRoleKey?.length || 0
    });
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Brak wymaganych zmiennych środowiskowych: SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY');
    }
    const body = await req.text();
    console.log(`[${requestId}] 📊 Otrzymano ${body.length} znaków`);
    if (!body || body.trim().length === 0) {
      throw new Error('Otrzymano pusty plik CSV');
    }
    const lines = body.split('\n').filter((line)=>line.trim());
    if (lines.length <= 1) {
      throw new Error('Plik CSV jest pusty lub ma tylko nagłówki');
    }
    // Ulepszone parsowanie CSV z obsługą cudzysłowów
    const parseCSVLine = (line)=>{
      const result = [];
      let current = '';
      let inQuotes = false;
      for(let i = 0; i < line.length; i++){
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
    const headers = parseCSVLine(lines[0]);
    const dataLines = lines.slice(1);
    console.log(`[${requestId}] 📋 Nagłówki:`, headers);
    console.log(`[${requestId}] 📋 Znaleziono ${dataLines.length} wierszy danych`);
    const processedData = [];
    let skippedRows = 0;
    for(let i = 0; i < dataLines.length; i++){
      try {
        const values = parseCSVLine(dataLines[i]);
        if (values.length !== headers.length) {
          console.warn(`[${requestId}] ⚠️ Wiersz ${i + 2}: oczekiwano ${headers.length} kolumn, otrzymano ${values.length}`);
          skippedRows++;
          continue;
        }
        const record = {};
        headers.forEach((header, index)=>{
          let value = values[index] || '';
          // Konwersja dat
          if (header.toLowerCase().includes('data') || header.toLowerCase().includes('date')) {
            value = convertPolishDate(value);
          }
          // Mapowanie kolumn - używamy dokładnych nazw z twojego schematu
          const headerLower = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          switch(headerLower){
            case 'kod_bebna':
              record.KOD_BEBNA = value;
              break;
            case 'nazwa':
              record.NAZWA = value;
              break;
            case 'cecha':
              record.CECHA = value;
              break;
            case 'nip':
              record.NIP = value;
              break;
            case 'data_zwrotu_do_dostawcy':
              record.DATA_ZWROTU_DO_DOSTAWCY = value;
              break;
            case 'kon_dostawca':
              record.KON_DOSTAWCA = value;
              break;
            case 'pelna_nazwa_kontrahenta':
              record.PELNA_NAZWA_KONTRAHENTA = value;
              break;
            case 'typ_dok':
              record.TYP_DOK = value;
              break;
            case 'nr_dokumentu':
              record.NR_DOKUMENTU = value;
              break;
            case 'upz':
              record.UPZ = value;
              break;
            case 'data_przyjecia_na_stan':
            case 'data_przyjecia_na_stan':
              record['Data przyjęcia na stan'] = value;
              break;
            case 'kontrahent':
              record.KONTRAHENT = value;
              break;
            case 'status':
              record.STATUS = value;
              break;
            case 'data_wydania':
              record.DATA_WYDANIA = value;
              break;
            default:
              // Zachowaj oryginalny nagłówek jeśli nie ma mapowania
              record[header] = value;
          }
        });
        // Sprawdź wymagane pola
        if (!record.KOD_BEBNA || !record.NIP) {
          console.warn(`[${requestId}] ⚠️ Wiersz ${i + 2}: brak wymaganych pól (KOD_BEBNA: "${record.KOD_BEBNA}", NIP: "${record.NIP}")`);
          skippedRows++;
          continue;
        }
        processedData.push(record);
      } catch (rowError) {
        console.error(`[${requestId}] ❌ Błąd w wierszu ${i + 2}:`, rowError);
        skippedRows++;
        continue;
      }
    }
    if (processedData.length === 0) {
      throw new Error(`Nie znaleziono prawidłowych rekordów do importu. Pominięto: ${skippedRows} wierszy`);
    }
    console.log(`[${requestId}] 📝 Przygotowano ${processedData.length} rekordów do importu`);
    console.log(`[${requestId}] 📝 Przykład pierwszego rekordu:`, processedData[0]);
    console.log(`[${requestId}] 🗑️ Czyszczenie starej tabeli...`);
    const { error: deleteError } = await supabase.from('drums').delete().neq('id', 0);
    if (deleteError) {
      console.error(`[${requestId}] ❌ Błąd usuwania:`, deleteError);
      throw new Error(`Błąd podczas usuwania starych danych: ${deleteError.message}`);
    }
    console.log(`[${requestId}] ✅ Stara tabela wyczyszczona`);
    console.log(`[${requestId}] 📝 Wstawianie ${processedData.length} nowych rekordów...`);
    // Wstawiaj w batch'ach po 1000 rekordów
    const batchSize = 1000;
    let totalInserted = 0;
    for(let i = 0; i < processedData.length; i += batchSize){
      const batch = processedData.slice(i, i + batchSize);
      console.log(`[${requestId}] 📝 Batch ${Math.floor(i / batchSize) + 1}: wstawianie ${batch.length} rekordów...`);
      const { error: insertError, count } = await supabase.from('drums').insert(batch).select('id', {
        count: 'exact'
      });
      if (insertError) {
        console.error(`[${requestId}] ❌ Błąd wstawiania batch ${Math.floor(i / batchSize) + 1}:`, insertError);
        throw new Error(`Błąd podczas wstawiania danych (batch ${Math.floor(i / batchSize) + 1}): ${insertError.message}`);
      }
      totalInserted += count || batch.length;
      console.log(`[${requestId}] ✅ Batch ${Math.floor(i / batchSize) + 1}: wstawiono ${count || batch.length} rekordów`);
    }
    console.log(`[${requestId}] 🎉 SUKCES! Zaimportowano ${totalInserted} rekordów`);
    const successResponse = {
      success: true,
      message: `Pomyślnie zaimportowano ${totalInserted} bębnów${skippedRows > 0 ? ` (pominięto ${skippedRows} nieprawidłowych wierszy)` : ''}`,
      imported: totalInserted,
      skipped: skippedRows,
      timestamp: new Date().toISOString(),
      requestId: requestId
    };
    console.log(`[${requestId}] 📤 Zwracam odpowiedź:`, successResponse);
    return new Response(JSON.stringify(successResponse), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ BŁĄD:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    const errorResponse = {
      success: false,
      error: true,
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId: requestId
    };
    console.log(`[${requestId}] 📤 Zwracam błąd:`, errorResponse);
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

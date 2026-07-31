// supabase/functions/clever-action/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function convertPolishDate(dateStr: string) {
  if (!dateStr || dateStr.trim() === '') return '';
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] ${req.method} ${req.url} - Start`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Weryfikacja autoryzacji tokenu Bearer JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: true, message: 'Brak tokena autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: true, message: 'Nieprawidłowy token autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['admin', 'supervisor', 'magazyn', 'dyrektor', 'kierownik'];
    if (!profile || !allowedRoles.includes(profile.role.toLowerCase())) {
      return new Response(JSON.stringify({ error: true, message: 'Brak uprawnień. Tylko administrator lub magazynier może wykonywać ten import.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[${requestId}] 🚀 Rozpoczynanie importu CSV przez ${user.email}...`);

    const body = await req.text();
    if (!body || body.trim().length === 0) {
      throw new Error('Otrzymano pusty plik CSV');
    }
    
    const lines = body.split('\n').filter((line) => line.trim());
    if (lines.length <= 1) {
      throw new Error('Plik CSV jest pusty lub ma tylko nagłówki');
    }

    const parseCSVLine = (line: string) => {
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

    const headers = parseCSVLine(lines[0]);
    const dataLines = lines.slice(1);
    const processedData = [];
    let skippedRows = 0;

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const values = parseCSVLine(dataLines[i]);
        if (values.length !== headers.length) {
          skippedRows++;
          continue;
        }
        const record: any = {};
        headers.forEach((header, index) => {
          let value = values[index] || '';
          if (header.toLowerCase().includes('data') || header.toLowerCase().includes('date')) {
            value = convertPolishDate(value);
          }
          const headerLower = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          switch (headerLower) {
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
            case 'lokalizacja_wms':
              record.lokalizacja_wms = value;
              break;
            case 'magazyn':
              record.magazyn = value;
              break;
            default:
              record[header] = value;
          }
        });

        if (!record.KOD_BEBNA || !record.NIP) {
          skippedRows++;
          continue;
        }
        processedData.push(record);
      } catch (_) {
        skippedRows++;
        continue;
      }
    }

    if (processedData.length === 0) {
      throw new Error(`Nie znaleziono prawidłowych rekordów do importu. Pominięto: ${skippedRows} wierszy`);
    }

    console.log(`[${requestId}] 🗑️ Czyszczenie starej tabeli...`);
    const { error: deleteError } = await supabaseAdmin.from('drums').delete().neq('id', 0);
    if (deleteError) throw deleteError;

    console.log(`[${requestId}] 📝 Wstawianie ${processedData.length} nowych rekordów...`);
    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize);
      const { error: insertError, count } = await supabaseAdmin.from('drums').insert(batch).select('id', { count: 'exact' });
      if (insertError) throw insertError;
      totalInserted += count || batch.length;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Pomyślnie zaimportowano ${totalInserted} bębnów`,
      imported: totalInserted,
      skipped: skippedRows,
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: true,
      message: error.message,
      requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

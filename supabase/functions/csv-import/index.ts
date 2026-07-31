import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function convertPolishDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';
  
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) return dateStr;
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Weryfikacja autoryzacji
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: true, message: 'Brak tokena autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

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
      return new Response(JSON.stringify({ error: true, message: 'Brak uprawnień. Tylko administrator lub magazynier może wykonywać import CSV.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🚀 Rozpoczynanie importu CSV przez użytkownika ${user.email}...`);
    
    const body = await req.text();
    const lines = body.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      throw new Error('Plik CSV jest pusty lub ma tylko nagłówki');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const dataLines = lines.slice(1);
    
    console.log(`📋 Znaleziono ${dataLines.length} wierszy danych`);
    
    const processedData = dataLines.map(line => {
      const values = line.split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        if (header.includes('data') || header.includes('date')) {
          value = convertPolishDate(value);
        }
        
        switch(header.toLowerCase()) {
          case 'kod_bebna':
            record.kod_bebna = value;
            break;
          case 'nazwa':
            record.nazwa = value;
            break;
          case 'nip':
            record.nip = value;
            break;
          case 'data_zwrotu_do_dostawcy':
            record.data_zwrotu_do_dostawcy = value;
            break;
          case 'data_wydania':
            record.data_wydania = value;
            break;
          case 'data_przyjecia_na_stan':
            record.data_przyjecia_na_stan = value;
            break;
          case 'lokalizacja_wms':
            record.lokalizacja_wms = value;
            break;
          default:
            record[header.toLowerCase()] = value;
        }
      });
      
      return record;
    });
    
    // Czyszczenie i wstawianie
    console.log('🗑️ Czyszczenie starej tabeli...');
    const { error: deleteError } = await supabaseAdmin
      .from('drums')
      .delete()
      .neq('id', 0);
    
    if (deleteError) throw deleteError;
    console.log('✅ Stara tabela wyczyszczona');
    
    console.log('📝 Wstawianie nowych danych...');
    const { error: insertError } = await supabaseAdmin
      .from('drums')
      .insert(processedData);
    
    if (insertError) throw insertError;
    
    console.log(`🎉 SUKCES! Zaimportowano ${processedData.length} rekordów`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Pomyślnie zaimportowano ${processedData.length} bębnów`,
      imported: processedData.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ BŁĄD:', error);
    
    return new Response(JSON.stringify({
      error: true,
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
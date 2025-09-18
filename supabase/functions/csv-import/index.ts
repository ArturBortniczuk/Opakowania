import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function convertPolishDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';
  
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) return dateStr; // Jeśli nie polski format, zwróć jak było
  
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  try {
    console.log('🚀 Rozpoczynanie importu CSV...');
    
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
        
        // Automatyczna konwersja dat
        if (header.includes('data') || header.includes('date')) {
          value = convertPolishDate(value);
        }
        
        // Mapowanie kolumn na format bazy
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
          default:
            record[header.toLowerCase()] = value;
        }
      });
      
      return record;
    });
    
    // WYCZYŚĆ CAŁĄ TABELĘ
    console.log('🗑️ Czyszczenie starej tabeli...');
    const { error: deleteError } = await supabase
      .from('drums')
      .delete()
      .neq('id', 0); // PostgreSQL wymaga jakiegoś warunku
    
    if (deleteError) throw deleteError;
    console.log('✅ Stara tabela wyczyszczona');
    
    // WSTAW NOWE DANE
    console.log('📝 Wstawianie nowych danych...');
    const { error: insertError } = await supabase
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
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ BŁĄD:', error);
    
    return new Response(JSON.stringify({
      error: true,
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
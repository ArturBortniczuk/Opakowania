const supabase = createClient(
  'https://pobafitamzkzcfptuaqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmFmaXRhbXpremNmcHR1YXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTE0NTg3MTIsImV4cCI6MjAyNzAzNDcxMn0.XXX' // I don't have anon key but I can use service role key
);


async function run() {
  const search = "EP-10-2073-24";
  const safeSearch = `"%${search.replace(/"/g, '""')}%"`;
  const orString = `cecha.ilike.${safeSearch},kod_bebna.ilike.${safeSearch},nazwa.ilike.${safeSearch},pelna_nazwa_kontrahenta.ilike.${safeSearch},adres_dostawy.ilike.${safeSearch},nazwa_punktu_dostawy.ilike.${safeSearch},numer_faktury.ilike.${safeSearch}`;
  console.log("OR string:", orString);

  const { data, error } = await supabase
    .from('drums')
    .select('kod_bebna, cecha')
    .or(orString)
    .limit(10);
  
  if (error) console.error("Error:", error);
  else console.log("Data count:", data.length, data);
}
run();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pobafitamzkzcfptuaqj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmFmaXRhbXpremNmcHR1YXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4OTUzOTAsImV4cCI6MjA2NzQ3MTM5MH0.slbOJtgBsRBFdk92Rbi9icZuGchDEJNKuyU0SlLcUr8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPrices() {
  console.log("Checking drums and their prices...");

  // 1. Get total count
  const { count, error: countErr } = await supabase
    .from('drums')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error("Count error:", countErr);
    return;
  }
  console.log("Total drums in system:", count);

  // 2. Try to fetch all drums (up to 10,000) using range pagination to bypass 1000 limit
  let allDrums = [];
  const chunkSize = 1000;
  let page = 0;
  while (true) {
    const from = page * chunkSize;
    const to = from + chunkSize - 1;
    console.log(`Fetching rows from ${from} to ${to}...`);
    const { data, error } = await supabase
      .from('drums')
      .select('*')
      .range(from, to);

    if (error) {
      console.error("Fetch error:", error);
      break;
    }
    if (!data || data.length === 0) {
      break;
    }
    allDrums = allDrums.concat(data);
    if (data.length < chunkSize) {
      break;
    }
    page++;
  }

  console.log("Successfully fetched drums count:", allDrums.length);

  // 3. Analyze prices of these drums
  let pricedCount = 0;
  let zeroOrNullCount = 0;
  let totalPrice = 0;
  const priceFrequency = {};

  allDrums.forEach(d => {
    const price = parseFloat(d.cena_netto_bebna || d.CENA_NETTO_BEBNA || 0);
    if (price > 0) {
      pricedCount++;
      totalPrice += price;
      priceFrequency[price] = (priceFrequency[price] || 0) + 1;
    } else {
      zeroOrNullCount++;
    }
  });

  console.log(`Drums with price > 0: ${pricedCount}`);
  console.log(`Drums with price = 0 or null: ${zeroOrNullCount}`);
  console.log(`Sum of prices of all fetched drums: ${totalPrice} PLN`);
  console.log("Top 10 prices frequency:", Object.entries(priceFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10));

  // 4. Query specifically for Bud Brothers (let's find their NIP first, or query by contractor/NIP if we can find)
  // Let's print unique NIPs
  const nips = [...new Set(allDrums.map(d => d.nip).filter(Boolean))];
  console.log("Total unique NIPs in drums:", nips.length);

  // Let's find drums for the client from the screenshot (BUD BROTHERS).
  // We can search for companies matching "BUD BROTHERS" or find the company with 85 drums.
  const drumCountsByNip = {};
  allDrums.forEach(d => {
    if (d.nip) {
      drumCountsByNip[d.nip] = (drumCountsByNip[d.nip] || 0) + 1;
    }
  });

  const topNips = Object.entries(drumCountsByNip).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log("Top NIPs by drum count:", topNips);

  for (const [nip, count] of topNips) {
    const clientDrums = allDrums.filter(d => d.nip === nip);
    const clientTotalPrice = clientDrums.reduce((sum, d) => sum + parseFloat(d.cena_netto_bebna || 0), 0);
    console.log(`NIP: ${nip}, Count: ${count}, Sum of prices: ${clientTotalPrice} PLN, Avg: ${clientTotalPrice / count} PLN`);
  }
}

checkPrices();

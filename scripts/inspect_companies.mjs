import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pobafitamzkzcfptuaqj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmFmaXRhbXpremNmcHR1YXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4OTUzOTAsImV4cCI6MjA2NzQ3MTM5MH0.slbOJtgBsRBFdk92Rbi9icZuGchDEJNKuyU0SlLcUr8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log("Fetching a sample drum from DB...");
  const { data: drum, error: drumError } = await supabase
    .from('drums')
    .select('*')
    .limit(1);

  if (drumError) {
    console.error("Error fetching drum:", drumError);
  } else {
    console.log("Sample drum data:", drum);
  }

  console.log("\nFetching a sample return_request from DB...");
  const { data: ret, error: retError } = await supabase
    .from('return_requests')
    .select('*')
    .limit(1);

  if (retError) {
    console.error("Error fetching return:", retError);
  } else {
    console.log("Sample return data:", ret);
  }
}

inspect();

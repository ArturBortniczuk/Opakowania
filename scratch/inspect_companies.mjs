import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pobafitamzkzcfptuaqj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmFmaXRhbXpremNmcHR1YXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4OTUzOTAsImV4cCI6MjA2NzQ3MTM5MH0.slbOJtgBsRBFdk92Rbi9icZuGchDEJNKuyU0SlLcUr8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log("Fetching a sample company from DB...");
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching company:", error);
  } else {
    console.log("Sample company data:", data);
  }
}

inspect();

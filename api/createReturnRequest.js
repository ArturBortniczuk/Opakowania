import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ message: 'Brak danych zgłoszenia.' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Brak konfiguracji Supabase w zmiennych środowiskowych.');
      return res.status(500).json({ message: 'Błąd konfiguracji serwera.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Opcjonalna weryfikacja tokena użytkownika
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
          console.warn('Ostrzeżenie autoryzacji tokena w createReturnRequest:', userError?.message);
        }
      } catch (authErr) {
        console.warn('Błąd sprawdzania tokena:', authErr.message);
      }
    }

    // 2. Generowanie unikalnego numeru zgłoszenia w formacie ZO/XXXX/MM/RR
    const reqDate = payload.created_at ? new Date(payload.created_at) : new Date();
    const year = reqDate.getFullYear();
    const month = reqDate.getMonth(); // 0-11
    const yr = String(year).slice(2);
    const mo = String(month + 1).padStart(2, '0');

    // Bezpieczne granice początku i końca danego miesiąca (dla dowolnej liczby dni: 28, 29, 30, 31)
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
    const startOfNextMonth = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)).toISOString();

    // Pobierz wszystkie zgłoszenia z tego miesiąca bez ograniczeń RLS
    const { data: monthRequests, error: countErr } = await supabaseAdmin
      .from('return_requests')
      .select('request_number')
      .gte('created_at', startOfMonth)
      .lt('created_at', startOfNextMonth);

    let maxSeq = 0;
    if (monthRequests && monthRequests.length > 0) {
      monthRequests.forEach(r => {
        if (r.request_number && typeof r.request_number === 'string') {
          const parts = r.request_number.split('/');
          if (parts.length === 4 && parts[0] === 'ZO' && parts[2] === mo && parts[3] === yr) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
            }
          }
        }
      });
    }

    const nextSeq = maxSeq + 1;
    const formattedNum = `ZO/${String(nextSeq).padStart(4, '0')}/${mo}/${yr}`;

    const insertPayload = {
      ...payload,
      request_number: formattedNum
    };

    // 3. Bezpieczny insert z uprawnieniami service_role
    const { data, error: insertErr } = await supabaseAdmin
      .from('return_requests')
      .insert([insertPayload])
      .select()
      .single();

    if (insertErr) {
      console.error('Błąd zapisu zgłoszenia w bazie:', insertErr);
      return res.status(400).json({ message: insertErr.message, error: insertErr });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Krytyczny błąd w createReturnRequest:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas tworzenia zgłoszenia.', error: error.message });
  }
}

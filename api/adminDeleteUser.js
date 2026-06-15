import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Brakuje ID użytkownika do usunięcia.' });
    }

    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Brak konfiguracji Supabase w zmiennych środowiskowych Vercel.');
      return res.status(500).json({ message: 'Błąd konfiguracji serwera.' });
    }

    const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Sprawdzenie uprawnień wykonującego
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Brak tokena autoryzacji.' });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ message: 'Nieprawidłowy token autoryzacji.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień. Tylko Główny Administrator może usuwać konta.' });
    }

    // 2. Dodatkowe zabezpieczenie przed usunięciem samego siebie
    if (user.id === userId) {
      return res.status(400).json({ message: 'Nie możesz usunąć własnego konta z poziomu aplikacji.' });
    }

    // 3. Usunięcie konta przez GoTrue Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Błąd usuwania konta w Supabase:', deleteError);
      return res.status(400).json({ message: 'Błąd podczas usuwania konta: ' + deleteError.message });
    }

    return res.status(200).json({ success: true, message: 'Konto zostało trwale usunięte.' });
  } catch (error) {
    console.error('Krytyczny błąd podczas usuwania konta:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas usuwania konta.', error: error.message });
  }
}

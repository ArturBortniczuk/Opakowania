import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, password, name, role, nip, phone, companyName } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Brakuje wymaganych danych formularza (email, hasło, imię i nazwisko, rola).' });
    }

    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Brak konfiguracji Supabase w zmiennych środowiskowych Vercel.');
      return res.status(500).json({ message: 'Błąd konfiguracji serwera.' });
    }

    // Używamy Service Role Key, by móc tworzyć konta i omijać potwierdzenia email
    const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Sprawdzenie, kto wykonuje to żądanie (zabezpieczenie)
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Brak tokena autoryzacji.' });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ message: 'Nieprawidłowy token autoryzacji.' });
    }

    // 2. Sprawdzenie uprawnień w public.profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
      return res.status(403).json({ message: 'Brak uprawnień. Tylko Administrator lub Supervisor może tworzyć nowe konta.' });
    }

    // Zabezpieczenie przed tworzeniem kolejnych adminów przez kogoś kto nie jest głównym adminem
    if (role === 'admin' && profile.role !== 'admin') {
        return res.status(403).json({ message: 'Brak uprawnień. Tylko Główny Administrator może nadawać uprawnienia administratora.' });
    }

    // 3. Utworzenie użytkownika przez GoTrue Admin API
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone: phone || '',
        role,
        nip: nip || '',
        companyName: companyName || '',
        status: 'approved',
        rodoAccepted: true
      }
    });

    if (createError) {
      console.error('Błąd tworzenia konta w Supabase:', createError);
      if (createError.message.includes('already registered') || createError.message.includes('duplicate key')) {
          return res.status(400).json({ message: 'Konto o tym adresie e-mail już istnieje w systemie.' });
      }
      return res.status(400).json({ message: 'Błąd podczas tworzenia konta: ' + createError.message });
    }

    return res.status(200).json({ success: true, message: 'Konto zostało utworzone.', user: newAuthUser.user });
  } catch (error) {
    console.error('Krytyczny błąd podczas tworzenia konta:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas tworzenia konta.', error: error.message });
  }
}

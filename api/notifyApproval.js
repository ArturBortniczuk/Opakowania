import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Akceptujemy tylko żądania POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, name, companyName, nip, origin } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Brakuje adresu e-mail odbiorcy.' });
    }

    // 1. Weryfikacja tożsamości i uprawnień wywołującego (tylko pracownicy / admini)
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (token && supabaseUrl && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
          return res.status(401).json({ message: 'Nieprawidłowy token autoryzacji.' });
        }

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const allowedRoles = ['admin', 'supervisor', 'dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista'];
        if (!profile || !allowedRoles.includes(profile.role.toLowerCase())) {
          return res.status(403).json({ message: 'Brak uprawnień. Tylko uprawnieni pracownicy mogą wysyłać powiadomienia o aktywacji.' });
        }
      } catch (authValidationErr) {
        console.warn('Ostrzeżenie przy walidacji uprawnień tokena:', authValidationErr.message);
      }
    }

    // 2. Dynamiczny import nodemailer w środowisku serverless
    const nodemailer = require('nodemailer');
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      console.error('Brak konfiguracji SMTP w zmiennych środowiskowych Vercel.');
      return res.status(500).json({ message: 'Błąd konfiguracji serwera poczty.' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '465', 10),
      secure: parseInt(SMTP_PORT || '465', 10) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    const senderEmail = SMTP_USER.includes('@') ? SMTP_USER : 'opakowania@grupaeltron.pl';
    const siteUrl = origin || 'https://opakowania.grupaeltron.pl';
    const clientName = name || 'Kliencie';
    const displayCompany = companyName || 'Twojej firmy';
    const displayNip = nip || '-';

    // 3. Przygotowanie szablonu HTML
    const mailOptions = {
      from: `"Grupa Eltron - System Opakowań" <${senderEmail}>`,
      to: email,
      subject: `Twoje konto zostało aktywowane - Grupa Eltron`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; color: #1e293b;">
          <!-- Nagłówek z gradientem -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 30px 20px; color: #ffffff; text-align: center;">
            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
              System Zarządzania Bębnami
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3;">
              Twoje konto zostało aktywowane! 🎉
            </h1>
          </div>

          <!-- Główna zawartość -->
          <div style="padding: 30px 24px; background-color: #ffffff;">
            <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">
              Dzień dobry <strong>${clientName}</strong>,
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">
              Z przyjemnością informujemy, że Twój wniosek rejestracyjny został pomyślnie zweryfikowany przez nasz zespół. Twoje konto jest już w pełni aktywne i możesz zalogować się do portalu.
            </p>

            <!-- Karta ze szczegółami konta -->
            <div style="margin: 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;">
              <h3 style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                Szczegóły przypisanego konta
              </h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 35%;">Firma:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${displayCompany}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">NIP:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a; font-family: monospace;">${displayNip}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Login (E-mail):</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Status:</td>
                  <td style="padding: 6px 0;">
                    <span style="display: inline-block; background-color: #dcfce7; color: #15803d; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 12px;">
                      ✓ Aktywny
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Przycisk CTA -->
            <div style="text-align: center; margin: 32px 0 24px 0;">
              <a href="${siteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                Zaloguj się do portalu &rarr;
              </a>
            </div>

            <p style="font-size: 13px; text-align: center; color: #64748b; margin-bottom: 24px;">
              Do logowania użyj adresu e-mail oraz hasła ustalonego podczas rejestracji konta.
            </p>

            <!-- Co możesz zrobić w portalu -->
            <div style="margin-top: 28px; padding: 18px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
              <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #1e40af;">
                Co możesz teraz zrobić w portalu?
              </h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                <li>Przeglądać aktualny wykaz bębnów będących na stanie Twojej firmy</li>
                <li>Wygodnie zgłaszać zapotrzebowanie na odbiór i transport pustych bębnów</li>
                <li>Śledzić statusy zgłoszonych zleceń transportowych w czasie rzeczywistym</li>
                <li>Kontrolować terminy zwrotów i rozliczenia kaucji</li>
              </ul>
            </div>

            <p style="margin-top: 28px; font-size: 14px; color: #475569; line-height: 1.5;">
              W razie jakichkolwiek pytań lub wątpliwości zapraszamy do kontaktu z Działem Obsługi Opakowań:
              <br>
              <a href="mailto:opakowania@grupaeltron.pl" style="color: #2563eb; font-weight: 600; text-decoration: none;">opakowania@grupaeltron.pl</a>
            </p>
          </div>

          <!-- Stopka -->
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Grupa Eltron Sp. z o.o.</p>
            <p style="margin: 0; color: #94a3b8;">
              Wiadomość została wygenerowana automatycznie przez System Zarządzania Bębnami Grupy Eltron.
            </p>
          </div>
        </div>
      `
    };

    // 4. Wysyłamy e-mail
    await transporter.sendMail(mailOptions);
    console.log(`Wysłano e-mail potwierdzający aktywację konta do klienta: ${email} (${displayCompany}).`);

    return res.status(200).json({ success: true, message: 'Powiadomienie o aktywacji konta wysłane pomyślnie.' });
  } catch (error) {
    console.error('Błąd podczas wysyłania powiadomienia o aktywacji konta:', error);
    return res.status(500).json({ message: 'Błąd podczas wysyłania e-maila.', error: error.message });
  }
}

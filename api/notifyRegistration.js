export default async function handler(req, res) {
  // Akceptujemy tylko żądania POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, name, companyName, nip, phone } = req.body;

    // Sprawdzamy czy mamy wymagane dane
    if (!email || !name || !companyName || !nip) {
      return res.status(400).json({ message: 'Brakuje wymaganych danych formularza.' });
    }

    // Dynamiczny import nodemailer w środowisku serverless
    const nodemailer = require('nodemailer');

    // Pobieramy dane dostępowe SMTP ze zmiennych środowiskowych Vercela
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      console.error('Brak konfiguracji SMTP w zmiennych środowiskowych Vercel.');
      return res.status(500).json({ message: 'Błąd konfiguracji serwera poczty.' });
    }

    // Tworzymy transporter (klienta pocztowego)
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '465', 10),
      secure: parseInt(SMTP_PORT || '465', 10) === 465, // true dla 465, false dla innych
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    // Przygotowujemy ładną treść wiadomości HTML
    const senderEmail = SMTP_USER.includes('@') ? SMTP_USER : 'opakowania@grupaeltron.pl';
    const mailOptions = {
      from: `"Rejestracja - Grupa Eltron" <${senderEmail}>`,
      to: 'opakowania@grupaeltron.pl', // Adres docelowy (administratorzy)
      subject: `Nowy wniosek o dostęp do portalu: ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0;">Nowy wniosek o rejestrację</h2>
          </div>
          <div style="padding: 20px; background-color: #f8fafc; color: #334155;">
            <p>W systemie zarządzania bębnami Grupy Eltron pojawił się nowy wniosek o założenie konta.</p>
            
            <h3 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Dane klienta:</h3>
            <ul style="list-style-type: none; padding: 0;">
              <li style="margin-bottom: 10px;"><strong>Firma:</strong> ${companyName}</li>
              <li style="margin-bottom: 10px;"><strong>NIP:</strong> ${nip}</li>
              <li style="margin-bottom: 10px;"><strong>Imię i nazwisko (osoba kontaktowa):</strong> ${name}</li>
              <li style="margin-bottom: 10px;"><strong>Adres e-mail:</strong> <a href="mailto:${email}">${email}</a></li>
              <li style="margin-bottom: 10px;"><strong>Telefon:</strong> ${phone || 'Nie podano'}</li>
            </ul>

            <div style="margin-top: 30px; padding: 15px; background-color: #fff; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px;">Klient oczekuje na weryfikację i akceptację konta w panelu administratora.</p>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            Wiadomość wygenerowana automatycznie przez System Zarządzania Bębnami Grupy Eltron.
          </div>
        </div>
      `
    };

    // Wysyłamy e-mail
    await transporter.sendMail(mailOptions);
    console.log(`Powiadomienie e-mail o rejestracji ${companyName} zostało wysłane pomyślnie.`);

    return res.status(200).json({ success: true, message: 'Email wysłany pomyślnie.' });
  } catch (error) {
    console.error('Błąd podczas wysyłania e-maila:', error);
    return res.status(500).json({ message: 'Błąd podczas wysyłania e-maila.', error: error.message });
  }
}

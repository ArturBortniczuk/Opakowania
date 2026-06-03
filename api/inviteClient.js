export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, firstName, lastName, origin } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'Brakuje wymaganych danych formularza.' });
    }

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
    const siteUrl = origin || 'https://opakowania.grupaeltron.pl'; // fallback w razie braku origin

    const mailOptions = {
      from: `"Grupa Eltron - System Opakowań" <${senderEmail}>`,
      to: email,
      subject: `Zaproszenie do Systemu Zarządzania Bębnami Grupy Eltron`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0;">Zaproszenie do systemu</h2>
          </div>
          <div style="padding: 20px; background-color: #f8fafc; color: #334155;">
            <p>Dzień dobry ${firstName} ${lastName},</p>
            <p>Otrzymujesz to zaproszenie od handlowca Grupy Eltron. Zapraszamy do korzystania z naszego nowoczesnego <strong>Systemu Zarządzania Bębnami</strong>, który pozwala na wygodne i bezproblemowe zarządzanie opakowaniami zwrotnymi dla Twojej firmy.</p>
            
            <h3 style="color: #0f172a; margin-top: 25px;">Jak dołączyć?</h3>
            <ol style="padding-left: 20px; line-height: 1.6;">
              <li>Przejdź na naszą stronę korzystając z przycisku poniżej (lub skopiuj link).</li>
              <li>Wybierz opcję <strong>"Utwórz konto"</strong> na ekranie logowania.</li>
              <li>Wypełnij formularz wpisując swoje dane, w tym NIP oraz nazwę firmy.</li>
              <li>Złóż wniosek o dostęp.</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Przejdź do strony logowania</a>
            </div>

            <div style="margin-top: 30px; padding: 15px; background-color: #fff; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px;"><strong>Ważne:</strong> Twój wniosek rejestracyjny będzie musiał zostać zatwierdzony przez naszego administratora, abyś uzyskał dostęp do historii swoich bębnów. Ze względów bezpieczeństwa weryfikacja i akceptacja zgłoszenia trwa zazwyczaj <strong>do 24 godzin w dni robocze</strong>.</p>
            </div>
            
            <p style="margin-top: 25px;">W razie pytań, zapraszamy do kontaktu na adres: <a href="mailto:opakowania@grupaeltron.pl">opakowania@grupaeltron.pl</a>.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            Wiadomość wygenerowana automatycznie przez System Zarządzania Bębnami Grupy Eltron.
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Wysłano zaproszenie e-mail do klienta (${email}).`);

    return res.status(200).json({ success: true, message: 'Zaproszenie wysłane pomyślnie.' });
  } catch (error) {
    console.error('Błąd podczas wysyłania zaproszenia e-mail:', error);
    return res.status(500).json({ message: 'Błąd podczas wysyłania zaproszenia.', error: error.message });
  }
}

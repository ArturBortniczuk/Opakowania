// api/auth/register.js
const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nip, password, confirmPassword, loginMode = 'client' } = req.body;

  // Walidacja
  if (!nip || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    if (loginMode === 'admin') {
      // Rejestracja administratora
      const { rows: adminRows } = await sql`
        SELECT * FROM admin_users WHERE nip = ${nip}
      `;

      if (adminRows.length === 0) {
        return res.status(404).json({ error: 'Admin account not found' });
      }

      // Sprawdź czy już ma hasło
      if (adminRows[0].password_hash) {
        return res.status(400).json({ error: 'Password already set' });
      }

      // Hash hasła
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Zapisz hasło
      await sql`
        UPDATE admin_users 
        SET password_hash = ${passwordHash}
        WHERE nip = ${nip}
      `;

      const admin = adminRows[0];

      // Generuj token
      const token = jwt.sign(
        { 
          id: admin.id,
          nip: admin.nip,
          role: admin.role,
          loginMode: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        token,
        user: {
          id: admin.id,
          nip: admin.nip,
          username: admin.username,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          companyName: 'Grupa Eltron - Administrator'
        }
      });

    } else {
      // Rejestracja klienta
      const { rows: companyRows } = await sql`
        SELECT * FROM companies WHERE nip = ${nip}
      `;

      if (companyRows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = companyRows[0];

      // Sprawdź czy użytkownik już istnieje
      const { rows: existingUser } = await sql`
        SELECT * FROM users WHERE nip = ${nip}
      `;

      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Password already set' });
      }

      // Hash hasła
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Utwórz użytkownika
      await sql`
        INSERT INTO users (nip, password_hash, is_first_login, created_at)
        VALUES (${nip}, ${passwordHash}, false, CURRENT_TIMESTAMP)
      `;

      // Generuj token
      const token = jwt.sign(
        { 
          nip: company.nip,
          role: 'client',
          loginMode: 'client'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Aktualizuj aktywność firmy
      await sql`
        UPDATE companies 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE nip = ${nip}
      `;

      return res.status(200).json({
        token,
        user: {
          nip: company.nip,
          companyName: company.name,
          role: 'client'
        }
      });
    }

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
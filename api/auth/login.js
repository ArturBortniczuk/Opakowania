// api/auth/login.js
const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  // Ustaw CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nip, password, loginMode = 'client' } = req.body;

  try {
    if (loginMode === 'admin') {
      // Logowanie administratora
      const { rows } = await sql`
        SELECT * FROM admin_users 
        WHERE nip = ${nip} AND is_active = true
      `;

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const admin = rows[0];
      const isValidPassword = await bcrypt.compare(password, admin.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generuj JWT token
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

      // Aktualizuj ostatnie logowanie
      await sql`
        UPDATE admin_users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = ${admin.id}
      `;

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
      // Logowanie klienta
      const { rows: companyRows } = await sql`
        SELECT * FROM companies WHERE nip = ${nip}
      `;

      if (companyRows.length === 0) {
        return res.status(401).json({ error: 'Company not found' });
      }

      const company = companyRows[0];

      // Sprawdź czy użytkownik ma już hasło
      const { rows: userRows } = await sql`
        SELECT * FROM users WHERE nip = ${nip}
      `;

      if (userRows.length === 0) {
        // Pierwsze logowanie - potrzebne ustawienie hasła
        return res.status(200).json({
          firstLogin: true,
          company: {
            nip: company.nip,
            name: company.name
          }
        });
      }

      const user = userRows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Generuj JWT token
      const token = jwt.sign(
        { 
          nip: user.nip,
          role: 'client',
          loginMode: 'client'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Aktualizuj ostatnie logowanie
      await sql`
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP, is_first_login = false
        WHERE nip = ${nip}
      `;

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
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
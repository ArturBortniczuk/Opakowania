// api/return-periods/index.js
const { sql } = require('@vercel/postgres');
const jwt = require('jsonwebtoken');

// Middleware do autoryzacji
const authenticateToken = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = authenticateToken(req);

    if (req.method === 'GET') {
      const { nip } = req.query;

      if (nip) {
        // Pobierz termin zwrotu dla konkretnego klienta
        const { rows } = await sql`
          SELECT crp.return_period_days, c.name as company_name
          FROM companies c
          LEFT JOIN custom_return_periods crp ON c.nip = crp.nip
          WHERE c.nip = ${nip}
        `;

        if (rows.length === 0) {
          return res.status(404).json({ error: 'Company not found' });
        }

        return res.status(200).json({
          nip: nip,
          returnPeriodDays: rows[0].return_period_days || 85,
          companyName: rows[0].company_name,
          isDefault: !rows[0].return_period_days
        });

      } else {
        // Pobierz wszystkie niestandardowe terminy (tylko dla administratorów)
        if (user.role !== 'admin' && user.role !== 'supervisor') {
          return res.status(403).json({ error: 'Admin access required' });
        }

        const { rows } = await sql`
          SELECT crp.*, c.name as company_name, c.email, c.phone
          FROM custom_return_periods crp
          JOIN companies c ON crp.nip = c.nip
          ORDER BY c.name ASC
        `;

        return res.status(200).json(rows);
      }

    } else if (req.method === 'PUT') {
      // Aktualizacja terminu zwrotu (tylko administratorzy)
      if (user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { nip } = req.query;
      const { returnPeriodDays } = req.body;

      if (!nip || !returnPeriodDays) {
        return res.status(400).json({ error: 'NIP and returnPeriodDays are required' });
      }

      const days = parseInt(returnPeriodDays);
      if (days < 1 || days > 365) {
        return res.status(400).json({ error: 'Return period must be between 1 and 365 days' });
      }

      // Sprawdź czy firma istnieje
      const { rows: companyCheck } = await sql`
        SELECT name FROM companies WHERE nip = ${nip}
      `;

      if (companyCheck.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      if (days === 85) {
        // Usuń niestandardowy termin (przywróć domyślny)
        await sql`
          DELETE FROM custom_return_periods WHERE nip = ${nip}
        `;

        return res.status(200).json({
          message: 'Default return period restored (85 days)',
          nip: nip,
          returnPeriodDays: 85,
          isDefault: true
        });

      } else {
        // Ustaw niestandardowy termin
        const { rows } = await sql`
          INSERT INTO custom_return_periods (nip, return_period_days, updated_at)
          VALUES (${nip}, ${days}, CURRENT_TIMESTAMP)
          ON CONFLICT (nip) 
          DO UPDATE SET 
            return_period_days = EXCLUDED.return_period_days,
            updated_at = EXCLUDED.updated_at
          RETURNING *
        `;

        return res.status(200).json({
          message: 'Custom return period updated successfully',
          nip: nip,
          returnPeriodDays: days,
          isDefault: false,
          updatedAt: rows[0].updated_at
        });
      }

    } else if (req.method === 'DELETE') {
      // Usuń niestandardowy termin (przywróć domyślny)
      if (user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { nip } = req.query;

      if (!nip) {
        return res.status(400).json({ error: 'NIP is required' });
      }

      const { rows } = await sql`
        DELETE FROM custom_return_periods 
        WHERE nip = ${nip}
        RETURNING *
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Custom return period not found' });
      }

      return res.status(200).json({
        message: 'Custom return period removed, default period (85 days) restored',
        nip: nip,
        returnPeriodDays: 85,
        isDefault: true
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Return Periods API error:', error);
    
    if (error.message === 'Access token required' || error.message === 'Invalid or expired token') {
      return res.status(401).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
};
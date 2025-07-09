// api/companies/index.js
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
        // Pobierz konkretną firmę
        const { rows } = await sql`
          SELECT c.*, crp.return_period_days
          FROM companies c
          LEFT JOIN custom_return_periods crp ON c.nip = crp.nip
          WHERE c.nip = ${nip}
        `;

        if (rows.length === 0) {
          return res.status(404).json({ error: 'Company not found' });
        }

        // Sprawdź uprawnienia
        if (user.role === 'client' && user.nip !== nip) {
          return res.status(403).json({ error: 'Access denied' });
        }

        return res.status(200).json(rows[0]);

      } else {
        // Pobierz wszystkie firmy (tylko dla administratorów)
        if (user.role !== 'admin' && user.role !== 'supervisor') {
          return res.status(403).json({ error: 'Admin access required' });
        }

        const { rows } = await sql`
          SELECT c.*, crp.return_period_days,
            COUNT(d.id) as drums_count,
            COUNT(CASE WHEN d.data_zwrotu_do_dostawcy < CURRENT_DATE THEN 1 END) as overdue_drums,
            COUNT(rr.id) as total_requests,
            COUNT(CASE WHEN rr.status = 'Pending' THEN 1 END) as pending_requests
          FROM companies c
          LEFT JOIN custom_return_periods crp ON c.nip = crp.nip
          LEFT JOIN drums d ON c.nip = d.nip
          LEFT JOIN return_requests rr ON c.nip = rr.user_nip
          GROUP BY c.id, crp.return_period_days
          ORDER BY c.name ASC
        `;

        // Wzbogać dane o obliczone pola
        const enrichedCompanies = rows.map(company => ({
          ...company,
          drumsCount: parseInt(company.drums_count) || 0,
          overdueDrums: parseInt(company.overdue_drums) || 0,
          totalRequests: parseInt(company.total_requests) || 0,
          pendingRequests: parseInt(company.pending_requests) || 0,
          riskLevel: company.overdue_drums > 0 ? 'high' : 
                    company.pending_requests > 0 ? 'medium' : 'low',
          returnPeriodDays: company.return_period_days || 85
        }));

        return res.status(200).json(enrichedCompanies);
      }

    } else if (req.method === 'PUT') {
      // Aktualizacja danych firmy
      const { nip } = req.query;
      const { name, email, phone, address } = req.body;

      if (!nip) {
        return res.status(400).json({ error: 'NIP is required' });
      }

      // Sprawdź uprawnienia
      if (user.role === 'client' && user.nip !== nip) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { rows } = await sql`
        UPDATE companies 
        SET 
          name = COALESCE(${name}, name),
          email = COALESCE(${email}, email),
          phone = COALESCE(${phone}, phone),
          address = COALESCE(${address}, address),
          last_activity = CURRENT_TIMESTAMP
        WHERE nip = ${nip}
        RETURNING *
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      return res.status(200).json({
        message: 'Company updated successfully',
        company: rows[0]
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Companies API error:', error);
    
    if (error.message === 'Access token required' || error.message === 'Invalid or expired token') {
      return res.status(401).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
};
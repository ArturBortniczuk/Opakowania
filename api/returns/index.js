// api/returns/index.js
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
      // Pobieranie zgłoszeń zwrotów
      if (user.role === 'client') {
        // Klient widzi tylko swoje zgłoszenia
        const { rows } = await sql`
          SELECT rr.*, c.name as company_name
          FROM return_requests rr
          JOIN companies c ON rr.user_nip = c.nip
          WHERE rr.user_nip = ${user.nip}
          ORDER BY rr.created_at DESC
        `;

        return res.status(200).json(rows);

      } else if (user.role === 'admin' || user.role === 'supervisor') {
        // Administratorzy widzą wszystkie zgłoszenia
        const { nip } = req.query;
        
        let queryResult;
        if (nip) {
          queryResult = await sql`
            SELECT rr.*, c.name as company_name
            FROM return_requests rr
            JOIN companies c ON rr.user_nip = c.nip
            WHERE rr.user_nip = ${nip}
            ORDER BY rr.created_at DESC
          `;
        } else {
          queryResult = await sql`
            SELECT rr.*, c.name as company_name
            FROM return_requests rr
            JOIN companies c ON rr.user_nip = c.nip
            ORDER BY rr.created_at DESC
          `;
        }

        const { rows } = queryResult;
        return res.status(200).json(rows);
      }

    } else if (req.method === 'POST') {
      // Tworzenie nowego zgłoszenia zwrotu
      if (user.role !== 'client') {
        return res.status(403).json({ error: 'Only clients can create return requests' });
      }

      const {
        companyName,
        street,
        postalCode,
        city,
        email,
        loadingHours,
        availableEquipment,
        notes,
        collectionDate,
        selectedDrums
      } = req.body;

      // Walidacja
      if (!street || !postalCode || !city || !email || !loadingHours || !collectionDate || !selectedDrums || selectedDrums.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Sprawdź czy wszystkie wybrane bębny należą do użytkownika
      const drumCodes = selectedDrums;
      const placeholders = drumCodes.map(() => '?').join(',');
      
      const { rows: drumCheck } = await sql`
        SELECT kod_bebna FROM drums 
        WHERE nip = ${user.nip} AND kod_bebna = ANY(${selectedDrums})
      `;

      if (drumCheck.length !== selectedDrums.length) {
        return res.status(400).json({ error: 'Some selected drums do not belong to your account' });
      }

      // Określ priorytet na podstawie terminów zwrotu
      const { rows: overdueDrums } = await sql`
        SELECT COUNT(*) as count FROM drums 
        WHERE nip = ${user.nip} 
        AND kod_bebna = ANY(${selectedDrums})
        AND data_zwrotu_do_dostawcy < CURRENT_DATE
      `;

      const priority = overdueDrums[0].count > 0 ? 'High' : 'Normal';

      // Utwórz zgłoszenie
      const { rows } = await sql`
        INSERT INTO return_requests (
          user_nip,
          company_name,
          street,
          postal_code,
          city,
          email,
          loading_hours,
          available_equipment,
          notes,
          collection_date,
          selected_drums,
          priority,
          status,
          created_at
        ) VALUES (
          ${user.nip},
          ${companyName},
          ${street},
          ${postalCode},
          ${city},
          ${email},
          ${loadingHours},
          ${availableEquipment || ''},
          ${notes || ''},
          ${collectionDate},
          ${JSON.stringify(selectedDrums)},
          ${priority},
          'Pending',
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;

      // Aktualizuj aktywność firmy
      await sql`
        UPDATE companies 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE nip = ${user.nip}
      `;

      return res.status(201).json({
        message: 'Return request created successfully',
        request: rows[0]
      });

    } else if (req.method === 'PUT') {
      // Aktualizacja statusu zgłoszenia (tylko administratorzy)
      if (user.role !== 'admin' && user.role !== 'supervisor') {
        return res.status(403).json({ error: 'Only administrators can update return requests' });
      }

      const { id } = req.query;
      const { status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: 'Missing id or status' });
      }

      const validStatuses = ['Pending', 'Approved', 'Completed', 'Rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { rows } = await sql`
        UPDATE return_requests 
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Return request not found' });
      }

      return res.status(200).json({
        message: 'Return request updated successfully',
        request: rows[0]
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Returns API error:', error);
    
    if (error.message === 'Access token required' || error.message === 'Invalid or expired token') {
      return res.status(401).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
};
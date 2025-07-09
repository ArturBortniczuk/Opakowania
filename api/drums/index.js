// api/drums/index.js
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
      const { nip } = req.query; // Dla administratorów - mogą filtrować po NIP

      if (user.role === 'client') {
        // Klient widzi tylko swoje bębny
        const { rows } = await sql`
          SELECT 
            d.*,
            c.name as company_name,
            c.email as company_email,
            c.phone as company_phone,
            c.address as company_address,
            crp.return_period_days
          FROM drums d
          JOIN companies c ON d.nip = c.nip
          LEFT JOIN custom_return_periods crp ON d.nip = crp.nip
          WHERE d.nip = ${user.nip}
          ORDER BY d.kod_bebna ASC
        `;

        // Wzbogać dane o obliczone pola (status, dni do zwrotu, itp.)
        const enrichedDrums = rows.map(drum => {
          const now = new Date();
          const returnDate = new Date(drum.data_zwrotu_do_dostawcy);
          const issueDate = drum.data_wydania ? new Date(drum.data_wydania) : new Date(drum.data_przyjecia_na_stan);
          
          const daysDiff = Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));
          const daysInPossession = Math.ceil((now - issueDate) / (1000 * 60 * 60 * 24));
          
          let status = 'active';
          let statusColor = 'text-green-600';
          let statusBg = 'bg-green-100';
          let statusBorder = 'border-green-200';
          let statusText = 'Aktywny';
          
          if (daysDiff < 0) {
            status = 'overdue';
            statusColor = 'text-red-600';
            statusBg = 'bg-red-100';
            statusBorder = 'border-red-200';
            statusText = 'Przeterminowany';
          } else if (daysDiff <= 7) {
            status = 'due-soon';
            statusColor = 'text-yellow-600';
            statusBg = 'bg-yellow-100';
            statusBorder = 'border-yellow-200';
            statusText = `Za ${daysDiff} dni`;
          }
          
          return {
            ...drum,
            // Mapowanie do starych nazw kolumn dla kompatybilności z frontendem
            KOD_BEBNA: drum.kod_bebna,
            NAZWA: drum.nazwa,
            CECHA: drum.cecha,
            DATA_ZWROTU_DO_DOSTAWCY: drum.data_zwrotu_do_dostawcy,
            KON_DOSTAWCA: drum.kon_dostawca,
            PELNA_NAZWA_KONTRAHENTA: drum.company_name,
            NIP: drum.nip,
            TYP_DOK: drum.typ_dok,
            NR_DOKUMENTUPZ: drum.nr_dokumentupz,
            'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
            KONTRAHENT: drum.kontrahent,
            STATUS: drum.status,
            DATA_WYDANIA: drum.data_wydania,
            
            // Obliczone pola
            company: drum.company_name,
            companyPhone: drum.company_phone,
            companyEmail: drum.company_email,
            companyAddress: drum.company_address,
            status,
            statusColor,
            statusBg,
            statusBorder,
            statusText,
            daysDiff,
            daysInPossession,
            overdueDays: daysDiff < 0 ? Math.abs(daysDiff) : 0,
            returnPeriodDays: drum.return_period_days || 85
          };
        });

        return res.status(200).json(enrichedDrums);

      } else if (user.role === 'admin' || user.role === 'supervisor') {
        // Administratorzy widzą wszystkie bębny lub filtrowane po NIP
        let queryResult;

        if (nip) {
          queryResult = await sql`SELECT 
            d.*,
            c.name as company_name,
            c.email as company_email,
            c.phone as company_phone,
            c.address as company_address,
            crp.return_period_days
          FROM drums d
          JOIN companies c ON d.nip = c.nip
          LEFT JOIN custom_return_periods crp ON d.nip = crp.nip
          WHERE d.nip = ${nip}
          ORDER BY d.kod_bebna ASC`;
        } else {
          queryResult = await sql`SELECT 
            d.*,
            c.name as company_name,
            c.email as company_email,
            c.phone as company_phone,
            c.address as company_address,
            crp.return_period_days
          FROM drums d
          JOIN companies c ON d.nip = c.nip
          LEFT JOIN custom_return_periods crp ON d.nip = crp.nip
          ORDER BY d.kod_bebna ASC`;
        }

        const { rows } = queryResult;

        // Wzbogać dane podobnie jak dla klienta
        const enrichedDrums = rows.map(drum => {
          const now = new Date();
          const returnDate = new Date(drum.data_zwrotu_do_dostawcy);
          const issueDate = drum.data_wydania ? new Date(drum.data_wydania) : new Date(drum.data_przyjecia_na_stan);
          
          const daysDiff = Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));
          const daysInPossession = Math.ceil((now - issueDate) / (1000 * 60 * 60 * 24));
          
          let status = 'active';
          let statusColor = 'text-green-600';
          let statusBg = 'bg-green-100';
          let statusBorder = 'border-green-200';
          let statusText = 'Aktywny';
          
          if (daysDiff < 0) {
            status = 'overdue';
            statusColor = 'text-red-600';
            statusBg = 'bg-red-100';
            statusBorder = 'border-red-200';
            statusText = 'Przeterminowany';
          } else if (daysDiff <= 7) {
            status = 'due-soon';
            statusColor = 'text-yellow-600';
            statusBg = 'bg-yellow-100';
            statusBorder = 'border-yellow-200';
            statusText = `Za ${daysDiff} dni`;
          }
          
          return {
            ...drum,
            // Mapowanie kolumn
            KOD_BEBNA: drum.kod_bebna,
            NAZWA: drum.nazwa,
            CECHA: drum.cecha,
            DATA_ZWROTU_DO_DOSTAWCY: drum.data_zwrotu_do_dostawcy,
            KON_DOSTAWCA: drum.kon_dostawca,
            PELNA_NAZWA_KONTRAHENTA: drum.company_name,
            NIP: drum.nip,
            TYP_DOK: drum.typ_dok,
            NR_DOKUMENTUPZ: drum.nr_dokumentupz,
            'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
            KONTRAHENT: drum.kontrahent,
            STATUS: drum.status,
            DATA_WYDANIA: drum.data_wydania,
            
            // Obliczone pola
            company: drum.company_name,
            companyPhone: drum.company_phone,
            companyEmail: drum.company_email,
            companyAddress: drum.company_address,
            status,
            statusColor,
            statusBg,
            statusBorder,
            statusText,
            daysDiff,
            daysInPossession,
            overdueDays: daysDiff < 0 ? Math.abs(daysDiff) : 0,
            returnPeriodDays: drum.return_period_days || 85
          };
        });

        return res.status(200).json(enrichedDrums);

      } else {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Drums API error:', error);
    
    if (error.message === 'Access token required' || error.message === 'Invalid or expired token') {
      return res.status(401).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
};
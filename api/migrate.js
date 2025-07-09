// api/migrate.js
const { createTables, seedBasicData } = require('../migrations/001_initial_migration');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to run migration.' });
  }

  // Prosta autoryzacja - można uruchomić tylko z kluczem
  const { key } = req.body;
  if (key !== 'migrate-eltron-2024') {
    return res.status(401).json({ error: 'Invalid migration key' });
  }

  try {
    console.log('🚀 Starting database migration via API...');
    
    await createTables();
    await seedBasicData();
    
    return res.status(200).json({
      success: true,
      message: 'Database migration completed successfully!',
      testAccounts: [
        { type: 'Admin', nip: '0000000000', note: 'Set password on first login' },
        { type: 'Supervisor', nip: '1111111111', note: 'Set password on first login' },
        { type: 'Client', nip: '1234567890', note: 'Set password on first login' },
        { type: 'Client', nip: '9876543210', note: 'Set password on first login' }
      ]
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
};
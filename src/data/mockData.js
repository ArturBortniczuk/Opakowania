// src/data/mockData.js

// Dane administratorów
export const mockAdmins = [
  {
    id: 1,
    nip: '0000000000',
    username: 'admin',
    role: 'admin',
    name: 'Administrator Systemu',
    email: 'admin@eltron.pl',
    permissions: ['view_all', 'manage_users', 'manage_drums', 'manage_returns']
  },
  {
    id: 2,
    nip: '1111111111', 
    username: 'supervisor',
    role: 'supervisor',
    name: 'Kierownik Logistyki',
    email: 'supervisor@eltron.pl',
    permissions: ['view_all', 'manage_drums', 'manage_returns']
  }
];

// Rozszerzone dane bębnów z dodatkowymi firmami
export const mockDrumsData = [
  {
    KOD_BEBNA: 'BEB001',
    NAZWA: 'Bęben stalowy 200L',
    CECHA: 'Standardowy',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-06-15',
    KON_DOSTAWCA: 'DOSTAWCA1',
    PELNA_NAZWA_KONTRAHENTA: 'Firma ABC Sp. z o.o.',
    NIP: '1234567890',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/001',
    'Data przyjęcia na stan': '2025-01-15',
    KONTRAHENT: 'ABC',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-01-15'
  },
  {
    KOD_BEBNA: 'BEB002',
    NAZWA: 'Bęben plastikowy 100L',
    CECHA: 'Specjalny',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-07-20',
    KON_DOSTAWCA: 'DOSTAWCA1',
    PELNA_NAZWA_KONTRAHENTA: 'Firma ABC Sp. z o.o.',
    NIP: '1234567890',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/002',
    'Data przyjęcia na stan': '2025-02-10',
    KONTRAHENT: 'ABC',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-02-10'
  },
  {
    KOD_BEBNA: 'BEB003',
    NAZWA: 'Bęben stalowy 150L',
    CECHA: 'Standardowy',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-05-25', // Przekroczony termin
    KON_DOSTAWCA: 'DOSTAWCA1',
    PELNA_NAZWA_KONTRAHENTA: 'Firma ABC Sp. z o.o.',
    NIP: '1234567890',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/003',
    'Data przyjęcia na stan': '2025-03-05',
    KONTRAHENT: 'ABC',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-03-05'
  },
  {
    KOD_BEBNA: 'BEB004',
    NAZWA: 'Bęben stalowy 200L',
    CECHA: 'Premium',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-06-01', // Zbliża się termin
    KON_DOSTAWCA: 'DOSTAWCA1',
    PELNA_NAZWA_KONTRAHENTA: 'Firma ABC Sp. z o.o.',
    NIP: '1234567890',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/004',
    'Data przyjęcia na stan': '2025-04-01',
    KONTRAHENT: 'ABC',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-04-01'
  },
  {
    KOD_BEBNA: 'BEB005',
    NAZWA: 'Bęben stalowy 150L',
    CECHA: 'Standardowy',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-08-30',
    KON_DOSTAWCA: 'DOSTAWCA2',
    PELNA_NAZWA_KONTRAHENTA: 'Przedsiębiorstwo XYZ S.A.',
    NIP: '9876543210',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/005',
    'Data przyjęcia na stan': '2025-03-05',
    KONTRAHENT: 'XYZ',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-03-05'
  },
  {
    KOD_BEBNA: 'BEB006',
    NAZWA: 'Bęben plastikowy 50L',
    CECHA: 'Kompaktowy',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-07-15',
    KON_DOSTAWCA: 'DOSTAWCA2',
    PELNA_NAZWA_KONTRAHENTA: 'Przedsiębiorstwo XYZ S.A.',
    NIP: '9876543210',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/006',
    'Data przyjęcia na stan': '2025-04-15',
    KONTRAHENT: 'XYZ',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-04-15'
  },
  {
    KOD_BEBNA: 'BEB007',
    NAZWA: 'Bęben stalowy 300L',
    CECHA: 'Przemysłowy',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-09-10',
    KON_DOSTAWCA: 'DOSTAWCA3',
    PELNA_NAZWA_KONTRAHENTA: 'Zakłady Chemiczne Delta Sp. z o.o.',
    NIP: '5555666677',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/007',
    'Data przyjęcia na stan': '2025-02-20',
    KONTRAHENT: 'DELTA',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-02-20'
  },
  {
    KOD_BEBNA: 'BEB008',
    NAZWA: 'Bęben plastikowy 25L',
    CECHA: 'Małą pojemność',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-06-05',
    KON_DOSTAWCA: 'DOSTAWCA4',
    PELNA_NAZWA_KONTRAHENTA: 'Zakłady Spożywcze Beta Sp. z o.o.',
    NIP: '7777888899',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/008',
    'Data przyjęcia na stan': '2025-01-20',
    KONTRAHENT: 'BETA',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-01-20'
  },
  {
    KOD_BEBNA: 'BEB009',
    NAZWA: 'Bęben stalowy 500L',
    CECHA: 'Duża pojemność',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-05-20', // Przekroczony
    KON_DOSTAWCA: 'DOSTAWCA3',
    PELNA_NAZWA_KONTRAHENTA: 'Zakłady Chemiczne Delta Sp. z o.o.',
    NIP: '5555666677',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/009',
    'Data przyjęcia na stan': '2025-02-01',
    KONTRAHENT: 'DELTA',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-02-01'
  },
  {
    KOD_BEBNA: 'BEB010',
    NAZWA: 'Bęben plastikowy 75L',
    CECHA: 'Standardowy',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-07-01',
    KON_DOSTAWCA: 'DOSTAWCA4',
    PELNA_NAZWA_KONTRAHENTA: 'Zakłady Spożywcze Beta Sp. z o.o.',
    NIP: '7777888899',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/010',
    'Data przyjęcia na stan': '2025-04-20',
    KONTRAHENT: 'BETA',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-04-20'
  },
  {
    KOD_BEBNA: 'BEB011',
    NAZWA: 'Bęben stalowy 250L',
    CECHA: 'Premium',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-08-15',
    KON_DOSTAWCA: 'DOSTAWCA5',
    PELNA_NAZWA_KONTRAHENTA: 'Fabryka Farb Gamma Sp. z o.o.',
    NIP: '3333444455',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/011',
    'Data przyjęcia na stan': '2025-03-10',
    KONTRAHENT: 'GAMMA',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-03-10'
  },
  {
    KOD_BEBNA: 'BEB012',
    NAZWA: 'Bęben stalowy 200L',
    CECHA: 'Standardowy',
    DATA_ZWROTU_DO_DOSTAWCY: '2025-05-30', // Zbliża się termin
    KON_DOSTAWCA: 'DOSTAWCA5',
    PELNA_NAZWA_KONTRAHENTA: 'Fabryka Farb Gamma Sp. z o.o.',
    NIP: '3333444455',
    TYP_DOK: 'WZ',
    NR_DOKUMENTUPZ: 'WZ/2025/012',
    'Data przyjęcia na stan': '2025-04-01',
    KONTRAHENT: 'GAMMA',
    STATUS: 'Aktywny',
    DATA_WYDANIA: '2025-04-01'
  }
];

// Lista wszystkich firm
export const mockCompanies = [
  {
    nip: '1234567890',
    name: 'Firma ABC Sp. z o.o.',
    email: 'kontakt@abc.pl',
    phone: '+48 123 456 789',
    address: 'ul. Przemysłowa 15, 00-001 Warszawa',
    drumsCount: 4,
    status: 'Aktywny',
    lastActivity: '2025-05-26'
  },
  {
    nip: '9876543210',
    name: 'Przedsiębiorstwo XYZ S.A.',
    email: 'biuro@xyz.pl',
    phone: '+48 987 654 321',
    address: 'ul. Fabryczna 22, 30-002 Kraków',
    drumsCount: 2,
    status: 'Aktywny',
    lastActivity: '2025-05-25'
  },
  {
    nip: '5555666677',
    name: 'Zakłady Chemiczne Delta Sp. z o.o.',
    email: 'delta@delta.pl',
    phone: '+48 555 666 777',
    address: 'ul. Chemiczna 5, 80-003 Gdańsk',
    drumsCount: 3,
    status: 'Aktywny',
    lastActivity: '2025-05-24'
  },
  {
    nip: '7777888899',
    name: 'Zakłady Spożywcze Beta Sp. z o.o.',
    email: 'beta@beta.pl',
    phone: '+48 777 888 999',
    address: 'ul. Spożywcza 12, 50-004 Wrocław',
    drumsCount: 2,
    status: 'Aktywny',
    lastActivity: '2025-05-23'
  },
  {
    nip: '3333444455',
    name: 'Fabryka Farb Gamma Sp. z o.o.',
    email: 'gamma@gamma.pl',
    phone: '+48 333 444 555',
    address: 'ul. Malarska 8, 60-005 Poznań',
    drumsCount: 2,
    status: 'Aktywny',
    lastActivity: '2025-05-22'
  }
];

// Zgłoszenia zwrotów
export const mockReturnRequests = [
  {
    id: 1,
    user_nip: '1234567890',
    company_name: 'Firma ABC Sp. z o.o.',
    collection_date: '2025-06-01',
    street: 'ul. Przemysłowa 15',
    postal_code: '00-001',
    city: 'Warszawa',
    email: 'kontakt@abc.pl',
    loading_hours: '8:00 - 16:00',
    available_equipment: 'wózek widłowy',
    notes: 'Prosimy o kontakt przed przyjazdem',
    selected_drums: ['BEB001', 'BEB002'],
    status: 'Pending',
    created_at: '2025-05-26T10:00:00Z',
    priority: 'Normal'
  },
  {
    id: 2,
    user_nip: '9876543210',
    company_name: 'Przedsiębiorstwo XYZ S.A.',
    collection_date: '2025-05-28',
    street: 'ul. Fabryczna 22',
    postal_code: '30-002',
    city: 'Kraków',
    email: 'logistyka@xyz.pl',
    loading_hours: '7:00 - 15:00',
    available_equipment: 'rampa załadunkowa',
    notes: 'Urgent - przekroczony termin',
    selected_drums: ['BEB005'],
    status: 'Approved',
    created_at: '2025-05-25T14:30:00Z',
    priority: 'High'
  },
  {
    id: 3,
    user_nip: '1234567890',
    company_name: 'Firma ABC Sp. z o.o.',
    collection_date: '2025-06-10',
    street: 'ul. Magazynowa 8',
    postal_code: '00-003',
    city: 'Warszawa',
    email: 'magazyn@abc.pl',
    loading_hours: '9:00 - 17:00',
    available_equipment: 'brak',
    notes: '',
    selected_drums: ['BEB003', 'BEB004'],
    status: 'Completed',
    created_at: '2025-05-20T09:15:00Z',
    priority: 'Normal'
  }
];

// src/data/additionalData.js
import { mockDrumsData } from './mockData';

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

// Niestandardowe terminy zwrotu dla klientów (w dniach)
export const mockCustomReturnPeriods = [
  { nip: '7221637863', returnPeriodDays: 90 }, // SUNGLO ma 90 dni zamiast 85
  { nip: '8942460042', returnPeriodDays: 120 }, // ELEKTROTIM ma 120 dni (specjalna umowa)
];

// Funkcja do konwersji polskich dat na format ISO
const convertPolishDateToISO = (polishDate) => {
  if (!polishDate || polishDate === ' ') return null;
  
  // Sprawdź czy to pełna data z czasem (DD/MM/YYYY HH:MM:SS)
  if (polishDate.includes(' ')) {
    const [datePart] = polishDate.split(' ');
    const [day, month, year] = datePart.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Zwykła data (DD/MM/YYYY)
  const [day, month, year] = polishDate.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// Funkcja pomocnicza do obliczania terminu zwrotu
export const calculateReturnDate = (issueDate, clientNip) => {
  if (!issueDate || issueDate === ' ') {
    // Jeśli brak daty wydania, użyj domyślnego terminu (85 dni od dzisiaj)
    const customPeriod = mockCustomReturnPeriods.find(period => period.nip === clientNip);
    const periodDays = customPeriod ? customPeriod.returnPeriodDays : 85;
    
    const today = new Date();
    const returnDate = new Date(today);
    returnDate.setDate(returnDate.getDate() + periodDays);
    
    return returnDate.toISOString().split('T')[0];
  }
  
  const customPeriod = mockCustomReturnPeriods.find(period => period.nip === clientNip);
  const periodDays = customPeriod ? customPeriod.returnPeriodDays : 85; // domyślnie 85 dni
  
  const isoDate = convertPolishDateToISO(issueDate);
  if (!isoDate) return null;
  
  const issueDateTime = new Date(isoDate);
  const returnDate = new Date(issueDateTime);
  returnDate.setDate(returnDate.getDate() + periodDays);
  
  return returnDate.toISOString().split('T')[0]; // format YYYY-MM-DD
};

// Funkcja do pobierania okresu zwrotu dla klienta
export const getReturnPeriodForClient = (clientNip) => {
  const customPeriod = mockCustomReturnPeriods.find(period => period.nip === clientNip);
  return customPeriod ? customPeriod.returnPeriodDays : 85;
};

// Funkcja do wzbogacania danych bębnów o obliczone terminy zwrotu
export const enrichDrumsWithCalculatedDates = (drums) => {
  return drums.map(drum => ({
    ...drum,
    DATA_ZWROTU_DO_DOSTAWCY: calculateReturnDate(drum['Data przyjęcia na stan'], drum.NIP) || drum.DATA_ZWROTU_DO_DOSTAWCY
  }));
};

// Automatyczne generowanie listy firm z istniejących danych bębnów
export const mockCompanies = Array.from(
  new Map(
    mockDrumsData.map(drum => [
      drum.NIP,
      {
        nip: drum.NIP,
        name: drum.PELNA_NAZWA_KONTRAHENTA,
        email: `kontakt@${drum.KONTRAHENT.toLowerCase().replace(/[^a-z0-9]/g, '')}.pl`,
        phone: '+48 123 456 789',
        address: 'ul. Przykładowa 1, 00-001 Warszawa',
        drumsCount: mockDrumsData.filter(d => d.NIP === drum.NIP).length,
        status: 'Aktywny',
        lastActivity: '2025-05-27'
      }
    ])
  ).values()
);

// Przykładowe zgłoszenia zwrotów
export const mockReturnRequests = [
  {
    id: 1,
    user_nip: '7221637863',
    company_name: 'SUNGLO SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
    collection_date: '2025-06-01',
    street: 'ul. Przemysłowa 15',
    postal_code: '00-001',
    city: 'Warszawa',
    email: 'kontakt@sunglo.pl',
    loading_hours: '8:00 - 16:00',
    available_equipment: 'wózek widłowy',
    notes: 'Prosimy o kontakt przed przyjazdem',
    selected_drums: ['B7NKT/BEB'],
    status: 'Pending',
    created_at: '2025-05-26T10:00:00Z',
    priority: 'Normal'
  },
  {
    id: 2,
    user_nip: '8942460042',
    company_name: 'ELEKTROTIM SPÓŁKA AKCYJNA',
    collection_date: '2025-05-28',
    street: 'ul. Fabryczna 22',
    postal_code: '30-002',
    city: 'Kraków',
    email: 'logistyka@elektrotim.pl',
    loading_hours: '7:00 - 15:00',
    available_equipment: 'rampa załadunkowa',
    notes: 'Urgent - przekroczony termin',
    selected_drums: ['B16NKT/BEB'],
    status: 'Approved',
    created_at: '2025-05-25T14:30:00Z',
    priority: 'High'
  },
  {
    id: 3,
    user_nip: '7963034522',
    company_name: 'ZBK RADOM SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
    collection_date: '2025-06-10',
    street: 'ul. Magazynowa 8',
    postal_code: '26-600',
    city: 'Radom',
    email: 'magazyn@zbkradom.pl',
    loading_hours: '9:00 - 17:00',
    available_equipment: 'brak',
    notes: '',
    selected_drums: ['B10TFK/BEB'],
    status: 'Completed',
    created_at: '2025-05-20T09:15:00Z',
    priority: 'Normal'
  }
];

// Funkcja do konwersji polskiej daty na czytelny format
export const formatPolishDate = (polishDate) => {
  if (!polishDate || polishDate === ' ') return 'Brak daty';
  
  const isoDate = convertPolishDateToISO(polishDate);
  if (!isoDate) return 'Nieprawidłowa data';
  
  return new Date(isoDate).toLocaleDateString('pl-PL');
};
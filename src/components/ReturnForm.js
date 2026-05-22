// src/components/ReturnForm.js - WERSJA Z OBSŁUGĄ CECHY I USZKODZEŃ
import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale/pl';
import { format, addDays, differenceInDays } from 'date-fns';
import {
  Calendar,
  MapPin,
  Mail,
  Clock,
  Truck,
  MessageSquare,
  Building2,
  CheckCircle,
  AlertCircle,
  Send,
  Package,
  User,
  AlertTriangle,
  Trash2,
  Phone,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { drumsAPI, returnsAPI } from '../utils/supabaseApi';

registerLocale('pl', pl);

const ReturnForm = ({ user, selectedDrum, onNavigate, onSubmit }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Oblicz minimalną datę (dzisiaj)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getEndDate = (startDateStr) => {
    const date = new Date(startDateStr);
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  };

  const minDate = getMinDate();

  const [formData, setFormData] = useState({
    collectionDateStart: minDate,
    collectionDateEnd: getEndDate(minDate),
    phoneNumber: '',
    companyName: user.companyName || user.name,
    street: '',
    postalCode: '',
    city: '',
    email: '',
    loadingHours: '',
    availableEquipment: '',
    notes: '',
    // ZMIANA: selectedDrums to teraz tablica obiektów { cecha, isDamaged, description, rozmiar, cena_netto }
    selectedDrums: selectedDrum ? [{
      cecha: selectedDrum.cecha || selectedDrum.CECHA || selectedDrum.kod_bebna,
      isDamaged: false,
      description: '',
      rozmiar: selectedDrum.rozmiar_bebna || selectedDrum.ROZMIAR_BEBNA,
      cena_netto: selectedDrum.cena_netto_bebna || selectedDrum.CENA_NETTO_BEBNA
    }] : [],
    confirmType: false,
    confirmEmpty: false
  });
  const [loading, setLoading] = useState(false);
  const [userDrums, setUserDrums] = useState([]);
  const [drumsLoading, setDrumsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateError, setDateError] = useState(false);
  // Pobierz bębny użytkownika
  useEffect(() => {
    const fetchUserDrums = async () => {
      setDrumsLoading(true);
      try {
        console.log('🔄 ReturnForm: Pobieranie bębnów dla', user.nip);

        const options = {
          page: 1,
          limit: 1000,
          sortBy: 'cecha', // ZMIANA: Sortowanie po 'cecha'
          sortOrder: 'asc'
        };

        const [result, returns] = await Promise.all([
          drumsAPI.getDrums(user.nip, options),
          returnsAPI.getReturns(user.nip)
        ]);
        
        console.log('✅ ReturnForm: Otrzymano dane:', result);

        const drums = result.data || result;

        // Zbieramy cechy bębnów, które są już w aktywnych zgłoszeniach zwrotu
        const reportedDrums = new Set();
        if (Array.isArray(returns)) {
          returns.forEach(req => {
            if (req.status !== 'Rejected' && req.status !== 'Cancelled') {
              if (Array.isArray(req.selected_drums)) {
                req.selected_drums.forEach(d => reportedDrums.add(d.cecha));
              }
            }
          });
        }

        if (!Array.isArray(drums)) {
          console.error('❌ ReturnForm: Dane nie są tablicą!', drums);
          setUserDrums([]);
        } else {
          // Filtrujemy tylko zagubione. Bębny już zgłoszone otrzymują flagę isReported.
          const visibleDrums = drums.filter(d => d.status !== 'Lost');
          const drumsWithReportedFlag = visibleDrums.map(d => ({
            ...d,
            isReported: reportedDrums.has(d.cecha)
          }));
          // Sortujemy tak, żeby zgłoszone były na samym dole
          const sortedDrums = drumsWithReportedFlag.sort((a, b) => {
            if (a.isReported === b.isReported) return 0;
            return a.isReported ? 1 : -1;
          });
          console.log(`✅ ReturnForm: Załadowano ${sortedDrums.length} bębnów`);
          setUserDrums(sortedDrums);
        }
      } catch (err) {
        console.error('❌ Błąd podczas pobierania bębnów:', err);
        setUserDrums([]);
      } finally {
        setDrumsLoading(false);
      }
    };

    if (user?.nip) {
      fetchUserDrums();
    } else {
      setDrumsLoading(false);
      setUserDrums([]);
    }
  }, [user?.nip]);

  // Obsługa zmiany daty z kalendarza (zakres)
  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    
    if (start && end) {
      const diffDays = differenceInDays(end, start);
      if (diffDays < 14) {
        // Wybrano mniej niż 14 dni - blokujemy możliwość zapisu daty końcowej
        setDateError(true);
        setFormData(prev => ({ 
          ...prev, 
          collectionDateStart: format(start, 'yyyy-MM-dd'), 
          collectionDateEnd: '' // Czyścimy datę końcową, aby zablokować przejście dalej
        }));
      } else {
        // Okres poprawny
        setDateError(false);
        setFormData(prev => ({ 
          ...prev, 
          collectionDateStart: format(start, 'yyyy-MM-dd'), 
          collectionDateEnd: format(end, 'yyyy-MM-dd')
        }));
      }
    } else if (start) {
      // Wybrano tylko początek, czekamy na kliknięcie końca
      setDateError(false);
      setFormData(prev => ({ 
        ...prev, 
        collectionDateStart: format(start, 'yyyy-MM-dd'), 
        collectionDateEnd: ''
      }));
    } else {
      // Wyczyszczono daty
      setDateError(false);
      setFormData(prev => ({ 
        ...prev, 
        collectionDateStart: '', 
        collectionDateEnd: ''
      }));
    }
  };

  const steps = [
    { id: 1, title: 'Adres odbioru', icon: MapPin },
    { id: 2, title: 'Szczegóły', icon: MessageSquare },
    { id: 3, title: 'Wybór bębnów', icon: Package },
    { id: 4, title: 'Potwierdzenie', icon: CheckCircle }
  ];

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.street.trim() && formData.postalCode.trim() && formData.city.trim();
      case 2:
        return formData.email.trim() && formData.phoneNumber.trim() && formData.loadingHours.trim() && formData.collectionDateStart && formData.collectionDateEnd && formData.availableEquipment.trim();
      case 3:
        return formData.selectedDrums.length > 0;
      case 4:
        return formData.confirmType && formData.confirmEmpty;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      // Przygotuj dane do wysłania
      const notesWithPhoneAndDates = `Sugerowany termin zwrotu: od ${formData.collectionDateStart} do ${formData.collectionDateEnd}\nTelefon kontaktowy: ${formData.phoneNumber}\n\n${formData.notes || ''}`;

      const returnData = {
        user_nip: user.nip,
        company_name: formData.companyName,
        collection_date: formData.collectionDateStart, // Używamy daty początkowej dla sortowania w bazie
        street: formData.street,
        postal_code: formData.postalCode,
        city: formData.city,
        email: formData.email,
        loading_hours: formData.loadingHours,
        available_equipment: formData.availableEquipment,
        notes: notesWithPhoneAndDates,
        selected_drums: formData.selectedDrums // Teraz to tablica obiektów
      };

      // Wyślij zgłoszenie
      await returnsAPI.createReturn(returnData);

      setLoading(false);
      if (onSubmit) {
        onSubmit();
      } else {
        navigate('/my-returns');
      }
    } catch (err) {
      console.error('Błąd podczas wysyłania zgłoszenia:', err);
      setLoading(false);
      alert('Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie.');
    }
  };

  // Zgłaszanie zagubienia
  const handleReportLost = async (cecha, e) => {
    e.stopPropagation(); // Nie przełączaj zaznaczenia wyboru
    if (window.confirm(`Czy na pewno chcesz zgłosić zagubienie bębna ${cecha}? Zostanie on usunięty z listy twoich bębnów.`)) {
      try {
        await drumsAPI.reportLost(cecha, user.nip, 'Zgłoszone przez klienta w formularzu zwrotu');
        // Usuń z lokalnego stanu
        setUserDrums(prev => prev.filter(d => d.cecha !== cecha && d.kod_bebna !== cecha));
        // Usuń z zaznaczonych jeśli był
        setFormData(prev => ({
          ...prev,
          selectedDrums: prev.selectedDrums.filter(d => d.cecha !== cecha)
        }));
        alert('Zgłoszono zagubienie.');
      } catch (err) {
        console.error(err);
        alert('Błąd zgłaszania zagubienia.');
      }
    }
  };

  // Oblicz całkowitą wartość wybranych bębnów (netto z marżą 20%)
  const calculateSelectedDrumsValue = () => {
    let totalVal = 0;
    formData.selectedDrums.forEach(selDrum => {
      // Znajdź powiązany bęben w userDrums
      const origDrum = userDrums.find(d => d.cecha === selDrum.cecha);
      const cenaNetto = origDrum?.cena_netto_bebna || selDrum.cena_netto;
      if (cenaNetto) {
        const val = parseFloat(cenaNetto) * 1.2;
        if (!isNaN(val)) {
          totalVal += val;
        }
      }
    });
    return totalVal;
  };

  // Oblicz całkowitą wartość zwrotu z uwzględnieniem amortyzacji czasowej
  const calculateSelectedDrumsRefund = () => {
    let totalRefund = 0;
    formData.selectedDrums.forEach(selDrum => {
      const origDrum = userDrums.find(d => d.cecha === selDrum.cecha);
      const cenaNetto = origDrum?.cena_netto_bebna || selDrum.cena_netto;
      if (cenaNetto) {
        const val = parseFloat(cenaNetto) * 1.2;
        if (!isNaN(val)) {
          // Policz procent zwrotu
          const daysInPossession = origDrum?.daysInPossession !== undefined 
            ? origDrum.daysInPossession 
            : (origDrum?.data_wydania_z_magazynu ? Math.ceil((new Date() - new Date(origDrum.data_wydania_z_magazynu)) / (1000 * 60 * 60 * 24)) : 0);

          let returnPercentage = 100;
          if (daysInPossession <= 120) returnPercentage = 100;
          else if (daysInPossession <= 150) returnPercentage = 90;
          else if (daysInPossession <= 180) returnPercentage = 75;
          else if (daysInPossession <= 240) returnPercentage = 50;
          else if (daysInPossession <= 340) returnPercentage = 25;
          else returnPercentage = 1;

          totalRefund += val * (returnPercentage / 100);
        }
      }
    });
    return totalRefund;
  };

  // Logika toggle dla nowy struktury danych
  const handleDrumToggle = (drumCecha, drumRozmiar, drumCenaNetto) => {
    setFormData(prev => {
      const isSelected = prev.selectedDrums.some(d => d.cecha === drumCecha);

      if (isSelected) {
        // Usuń
        return {
          ...prev,
          selectedDrums: prev.selectedDrums.filter(d => d.cecha !== drumCecha)
        };
      } else {
        // Dodaj (domyślnie nieuszkodzony)
        return {
          ...prev,
          selectedDrums: [...prev.selectedDrums, { 
            cecha: drumCecha, 
            isDamaged: false, 
            description: '', 
            rozmiar: drumRozmiar, 
            cena_netto: drumCenaNetto 
          }]
        };
      }
    });
  };

  // Aktualizacja stanu uszkodzenia dla wybranego bębna
  const handleDamageChange = (drumCecha, field, value) => {
    setFormData(prev => ({
      ...prev,
      selectedDrums: prev.selectedDrums.map(item =>
        item.cecha === drumCecha
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${currentStep >= step.id
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg'
                : 'bg-gray-200 text-gray-500'
              }`}>
              <step.icon className="w-6 h-6" />
            </div>
            <span className={`text-sm mt-2 font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-16 h-1 mx-2 rounded transition-all duration-300 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Adres odbioru</h2>
              <p className="text-gray-600">Podaj dokładny adres skąd mają być odebrane bębny</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ulica i numer *
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="np. ul. Przemysłowa 15"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kod pocztowy *
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="00-000"
                    maxLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miasto *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="np. Warszawa"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MessageSquare className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Szczegóły odbioru</h2>
              <p className="text-gray-600">Określ datę odbioru oraz informacje o kontakcie i logistyce</p>
            </div>

            <div className="space-y-6">
              {/* Pierwszy wiersz: Data i Godziny */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline w-4 h-4 mr-2" />
                    Wybierz zakres dat odbioru (od - do) *
                  </label>
                  <div className="space-y-2 relative z-50">
                    <DatePicker
                      selectsRange={true}
                      startDate={formData.collectionDateStart ? new Date(formData.collectionDateStart) : null}
                      endDate={formData.collectionDateEnd ? new Date(formData.collectionDateEnd) : null}
                      onChange={handleDateRangeChange}
                      minDate={new Date()}
                      locale="pl"
                      dateFormat="dd.MM.yyyy"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white cursor-pointer ${dateError ? 'border-red-500' : 'border-gray-300'}`}
                      wrapperClassName="w-full"
                      placeholderText="Kliknij, aby wybrać zakres na kalendarzu"
                    />
                    {dateError ? (
                      <p className="text-xs text-red-500 font-medium">
                        Odstęp między datami musi wynosić co najmniej 14 dni!
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Wybierz datę początkową, a następnie datę końcową na kalendarzu.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline w-4 h-4 mr-2" />
                    Godziny załadunku *
                  </label>
                  <input
                    type="text"
                    value={formData.loadingHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, loadingHours: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="np. 8:00 - 16:00"
                  />
                </div>
              </div>

              {/* Drugi wiersz: Email i Telefon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline w-4 h-4 mr-2" />
                    Email do korespondencji *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="kontakt@firma.pl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline w-4 h-4 mr-2" />
                    Telefon kontaktowy *
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="np. +48 123 456 789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Truck className="inline w-4 h-4 mr-2" />
                  Dostępny sprzęt załadunkowy *
                </label>
                <input
                  type="text"
                  value={formData.availableEquipment}
                  onChange={(e) => setFormData(prev => ({ ...prev, availableEquipment: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="np. wózek widłowy, rampa załadunkowa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Uwagi dodatkowe
                </label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Dodatkowe informacje dla kuriera..."
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Package className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Wybór bębnów</h2>
              <p className="text-gray-600">Zaznacz bębny które chcesz zwrócić</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Wybrano: <strong>{formData.selectedDrums.length}</strong> z <strong>{userDrums.length}</strong> dostępnych bębnów
                </span>
              </div>
            </div>

            {drumsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-gray-600">Ładowanie bębnów...</p>
              </div>
            ) : userDrums.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Brak dostępnych bębnów do zwrotu</p>
              </div>
            ) : (
              <>
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Wyszukaj bęben (po cesze, nazwie, kodzie)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                  {userDrums.filter(d => 
                    d.cecha?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    d.nazwa?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.kod_bebna?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.numer_faktury?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.adres_dostawy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.nazwa_punktu_dostawy?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((drum, index) => {
                  const drumCecha = drum.cecha; // UŻYWAMY CECHY JAKO ID
                  const returnDate = drum.clientReturnDeadline || drum.data_zwrotu_do_dostawcy;
                  const address = drum.adres_dostawy || drum.nazwa_punktu_dostawy || 'Brak informacji o adresie';
                  const invoice = drum.numer_faktury || 'Brak faktury';

                  // Obliczanie dni pozostałych do zwrotu
                  let daysLeft = null;
                  let isLateOrSoon = false;
                  if (returnDate) {
                    daysLeft = differenceInDays(new Date(returnDate), new Date());
                    if (daysLeft < 20) {
                      isLateOrSoon = true;
                    }
                  }

                  // Sprawdź czy wybrany
                  const selectedItem = formData.selectedDrums.find(d => d.cecha === drumCecha);
                  const isSelected = !!selectedItem;
                  const isReported = drum.isReported; // Flaga zgłoszonego bębna

                  // Obliczanie % zwrotu (zależny wyłącznie od ilości dni w posiadaniu)
                  let returnPercentage = 100;
                  const daysInPossession = drum.daysInPossession !== undefined 
                    ? drum.daysInPossession 
                    : (drum.data_wydania_z_magazynu ? Math.ceil((new Date() - new Date(drum.data_wydania_z_magazynu)) / (1000 * 60 * 60 * 24)) : 0);

                  if (daysInPossession <= 120) returnPercentage = 100;
                  else if (daysInPossession <= 150) returnPercentage = 90;
                  else if (daysInPossession <= 180) returnPercentage = 75;
                  else if (daysInPossession <= 240) returnPercentage = 50;
                  else if (daysInPossession <= 340) returnPercentage = 25;
                  else returnPercentage = 1;

                  return (
                    <div
                      key={drumCecha || index}
                      className={`border-2 rounded-xl p-4 transition-all duration-200 ${isReported
                          ? 'border-gray-200 bg-gray-100 opacity-60'
                          : isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                        }`}
                    >
                      {/* Nagłówek Karty */}
                      <div
                        className={`flex items-center justify-between mb-2 ${isReported ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => !isReported && handleDrumToggle(drumCecha, drum.rozmiar_bebna, drum.cena_netto_bebna)}
                      >
                        <div>
                          <span className="font-semibold text-gray-900">{drumCecha}</span>
                          {drum.rozmiar_bebna && (
                            <span className="ml-2 text-[10px] text-gray-500 font-medium bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded shrink-0">
                              Rozmiar: {drum.rozmiar_bebna}
                            </span>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isReported}
                          onChange={() => { }} // Obsłużone przez onClick diva
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Informacje Finansowe i Zwrot */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <div className="inline-block px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-xs font-semibold text-indigo-700">
                          Możliwy zwrot wartości: {returnPercentage}%
                        </div>
                        {drum.cena_netto_bebna && (
                          <div className="inline-block px-2 py-1 bg-blue-50 border border-blue-100 rounded text-xs font-semibold text-blue-700">
                            Wartość bębna: {((parseFloat(drum.cena_netto_bebna) || 0) * 1.2).toFixed(2)} PLN
                          </div>
                        )}
                      </div>

                      {/* Adres i Faktura */}
                      <p className="text-sm text-gray-600 mb-1">
                        Adres: <span className="font-medium">{address}</span>
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        Faktura: <span className="font-medium">{invoice}</span>
                      </p>

                      <p className={`text-xs mb-3 font-medium ${isLateOrSoon && !isReported ? 'text-red-600' : 'text-gray-500'}`}>
                        Termin zwrotu: {returnDate ? new Date(returnDate).toLocaleDateString('pl-PL') : 'Brak'}
                        {!isReported && daysLeft !== null && ` (${daysLeft >= 0 ? `Pozostało: ${daysLeft} dni` : `Opóźnienie: ${Math.abs(daysLeft)} dni`})`}
                      </p>

                      {/* Sekcja przycisków akcji */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {isReported ? (
                          <div className="w-full text-center py-1.5 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg">
                            Bęben już zgłoszony
                          </div>
                        ) : isSelected ? (
                          // Sekcja Uszkodzeń (tylko gdy wybrany)
                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-700 font-medium">
                              <input
                                type="checkbox"
                                checked={selectedItem.isDamaged}
                                onChange={(e) => handleDamageChange(drumCecha, 'isDamaged', e.target.checked)}
                                className="text-red-500 focus:ring-red-500 rounded border-gray-300"
                              />
                              <span>Czy bęben jest uszkodzony?</span>
                            </label>

                            {selectedItem.isDamaged && (
                              <div className="animate-fadeIn">
                                <textarea
                                  placeholder="Opisz uszkodzenie..."
                                  value={selectedItem.description}
                                  onChange={(e) => handleDamageChange(drumCecha, 'description', e.target.value)}
                                  className="w-full text-sm p-2 border border-red-200 bg-red-50 rounded-lg focus:outline-none focus:border-red-400"
                                  rows={2}
                                />
                                <p className="text-xs text-red-600 mt-1 italic">
                                  ⚠ W przypadku uszkodzenia zastrzegamy sobie prawo do wystawienia faktury o wartości bębna.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Sekcja Zgubienia (tylko gdy NIE wybrany)
                          <button
                            onClick={(e) => handleReportLost(drumCecha, e)}
                            className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 text-gray-600 hover:text-red-600 rounded-lg text-sm transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Zgłoś zagubienie</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Potwierdzenie</h2>
              <p className="text-gray-600">Sprawdź dane i potwierdź zgłoszenie</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Sugerowany okres</p>
                  <p className="font-medium text-gray-900">
                    {formData.collectionDateStart && new Date(formData.collectionDateStart).toLocaleDateString('pl-PL')} - {formData.collectionDateEnd && new Date(formData.collectionDateEnd).toLocaleDateString('pl-PL')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefon</p>
                  <p className="font-medium text-gray-900">{formData.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Adres</p>
                  <p className="font-medium text-gray-900">
                    {formData.street}, {formData.postalCode} {formData.city}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{formData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ilość bębnów</p>
                  <p className="font-medium text-gray-900">{formData.selectedDrums.length} szt.</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Uszkodzone</p>
                  <p className="font-medium text-red-600">
                    {formData.selectedDrums.filter(d => d.isDamaged).length} szt.
                  </p>
                </div>
                {calculateSelectedDrumsValue() > 0 && (
                  <>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-500">Suma wartości bębnów</p>
                      <p className="font-semibold text-gray-900">{calculateSelectedDrumsValue().toFixed(2)} PLN</p>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-500">Szacowana kwota zwrotu</p>
                      <p className="font-extrabold text-blue-700">{calculateSelectedDrumsRefund().toFixed(2)} PLN</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.confirmType}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmType: e.target.checked }))}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-900">
                  Potwierdzam, że zwracam bębny tego samego typu i wielkości co otrzymane
                </span>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.confirmEmpty}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmEmpty: e.target.checked }))}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-900">
                  Potwierdzam, że wszystkie zwracane bębny są całkowicie puste
                </span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Zgłoszenie zwrotu bębnów
              </h1>
              <p className="text-gray-600">Wypełnij formularz aby zgłosić odbiór bębnów</p>
            </div>
          </div>
        </div>

        <StepIndicator />

        {/* Form Content */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-blue-100 p-8">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => currentStep === 1 ? (onNavigate ? onNavigate('dashboard') : navigate('/dashboard')) : handlePrev()}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              {currentStep === 1 ? 'Anuluj' : 'Wstecz'}
            </button>

            <div className="flex items-center space-x-4">
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${validateStep(currentStep)
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <span>Dalej</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!validateStep(4) || loading}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${validateStep(4) && !loading
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Wysyłanie...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Wyślij zgłoszenie</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArrowRight = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default ReturnForm;
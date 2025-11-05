// src/components/ReturnForm.js - NAPRAWIONA WERSJA
import React, { useState, useEffect } from 'react';
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
  User
} from 'lucide-react';
import { drumsAPI, returnsAPI } from '../utils/supabaseApi';

const ReturnForm = ({ user, selectedDrum, onNavigate, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    collectionDate: new Date().toISOString().split('T')[0],
    companyName: user.companyName || user.name,
    street: '',
    postalCode: '',
    city: '',
    email: '',
    loadingHours: '',
    availableEquipment: '',
    notes: '',
    selectedDrums: selectedDrum ? [selectedDrum.kod_bebna || selectedDrum.KOD_BEBNA] : [],
    confirmType: false,
    confirmEmpty: false
  });
  const [loading, setLoading] = useState(false);
  const [userDrums, setUserDrums] = useState([]);
  const [drumsLoading, setDrumsLoading] = useState(true);

  // Pobierz bębny użytkownika - NAPRAWIONE!
  useEffect(() => {
    const fetchUserDrums = async () => {
      setDrumsLoading(true);
      try {
        console.log('🔄 ReturnForm: Pobieranie bębnów dla', user.nip);
        
        // NAPRAWIONE: Dodaj opcje i obsłuż oba formaty odpowiedzi
        const options = {
          page: 1,
          limit: 1000,
          sortBy: 'kod_bebna',
          sortOrder: 'asc'
        };
        
        const result = await drumsAPI.getDrums(user.nip, options);
        console.log('✅ ReturnForm: Otrzymano dane:', result);
        
        // WAŻNE: Obsłuż oba formaty - obiekt z paginacją lub bezpośrednio tablica
        const drums = result.data || result;
        
        if (!Array.isArray(drums)) {
          console.error('❌ ReturnForm: Dane nie są tablicą!', drums);
          setUserDrums([]);
        } else {
          console.log(`✅ ReturnForm: Załadowano ${drums.length} bębnów`);
          setUserDrums(drums);
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

  const steps = [
    { id: 1, title: 'Dane podstawowe', icon: Building2 },
    { id: 2, title: 'Adres odbioru', icon: MapPin },
    { id: 3, title: 'Szczegóły', icon: MessageSquare },
    { id: 4, title: 'Wybór bębnów', icon: Package },
    { id: 5, title: 'Potwierdzenie', icon: CheckCircle }
  ];

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.collectionDate && formData.companyName;
      case 2:
        return formData.street.trim() && formData.postalCode.trim() && formData.city.trim();
      case 3:
        return formData.email.trim() && formData.loadingHours.trim();
      case 4:
        return formData.selectedDrums.length > 0;
      case 5:
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
    if (!validateStep(5)) return;
    
    setLoading(true);
    try {
      // Przygotuj dane do wysłania
      const returnData = {
        user_nip: user.nip,
        company_name: formData.companyName,
        collection_date: formData.collectionDate,
        street: formData.street,
        postal_code: formData.postalCode,
        city: formData.city,
        email: formData.email,
        loading_hours: formData.loadingHours,
        available_equipment: formData.availableEquipment,
        notes: formData.notes,
        selected_drums: formData.selectedDrums
      };

      // Wyślij zgłoszenie
      await returnsAPI.createReturn(returnData);
      
      setLoading(false);
      onSubmit();
    } catch (err) {
      console.error('Błąd podczas wysyłania zgłoszenia:', err);
      setLoading(false);
      alert('Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie.');
    }
  };

  const handleDrumToggle = (drumCode) => {
    setFormData(prev => ({
      ...prev,
      selectedDrums: prev.selectedDrums.includes(drumCode)
        ? prev.selectedDrums.filter(code => code !== drumCode)
        : [...prev.selectedDrums, drumCode]
    }));
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              currentStep >= step.id 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              <step.icon className="w-6 h-6" />
            </div>
            <span className={`text-sm mt-2 font-medium ${
              currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-16 h-1 mx-2 rounded transition-all duration-300 ${
              currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
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
              <Building2 className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Podstawowe informacje</h2>
              <p className="text-gray-600">Określ datę i firmę dla odbioru</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Data odbioru *
                </label>
                <input
                  type="date"
                  value={formData.collectionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="inline w-4 h-4 mr-2" />
                  Nazwa firmy *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Pełna nazwa firmy"
                />
              </div>
            </div>
          </div>
        );

      case 2:
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

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MessageSquare className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Szczegóły odbioru</h2>
              <p className="text-gray-600">Dodaj informacje o kontakcie i logistyce</p>
            </div>
            
            <div className="space-y-6">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Truck className="inline w-4 h-4 mr-2" />
                  Dostępny sprzęt załadunkowy
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

      case 4:
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {userDrums.map((drum, index) => {
                  const drumCode = drum.kod_bebna || drum.KOD_BEBNA;
                  const drumName = drum.nazwa || drum.NAZWA;
                  const returnDate = drum.data_zwrotu_do_dostawcy || drum.DATA_ZWROTU_DO_DOSTAWCY;
                  
                  return (
                    <div
                      key={drumCode || index}
                      className={`border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                        formData.selectedDrums.includes(drumCode)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                      onClick={() => handleDrumToggle(drumCode)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{drumCode}</span>
                        <input
                          type="checkbox"
                          checked={formData.selectedDrums.includes(drumCode)}
                          onChange={() => {}}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{drumName}</p>
                      <p className="text-xs text-gray-500">
                        Termin: {returnDate ? new Date(returnDate).toLocaleDateString('pl-PL') : 'Brak'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 5:
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
                  <p className="text-sm text-gray-500">Data odbioru</p>
                  <p className="font-medium text-gray-900">
                    {new Date(formData.collectionDate).toLocaleDateString('pl-PL')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Firma</p>
                  <p className="font-medium text-gray-900">{formData.companyName}</p>
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
                  <p className="font-medium text-gray-900">{formData.selectedDrums.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Godziny załadunku</p>
                  <p className="font-medium text-gray-900">{formData.loadingHours}</p>
                </div>
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
              onClick={() => currentStep === 1 ? onNavigate('dashboard') : handlePrev()}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              {currentStep === 1 ? 'Anuluj' : 'Wstecz'}
            </button>

            <div className="flex items-center space-x-4">
              {currentStep < 5 ? (
                <button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                    validateStep(currentStep)
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
                  disabled={!validateStep(5) || loading}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                    validateStep(5) && !loading
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
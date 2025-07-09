// src/components/ReturnForm.js
import React, { useState } from 'react';
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
import { mockDrumsData } from '../data/mockData';
import { calculateReturnDate, getReturnPeriodForClient } from '../data/additionalData';
const ReturnForm = ({ user, selectedDrum, onNavigate, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    collectionDate: new Date().toISOString().split('T')[0],
    companyName: user.companyName,
    street: '',
    postalCode: '',
    city: '',
    email: '',
    loadingHours: '',
    availableEquipment: '',
    notes: '',
    selectedDrums: selectedDrum ? [selectedDrum.KOD_BEBNA] : [],
    confirmType: false,
    confirmEmpty: false
  });
  const [loading, setLoading] = useState(false);

  const userDrums = mockDrumsData.filter(drum => drum.NIP === user.nip);

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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    onSubmit();
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
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-blue-100 mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isAccessible = validateStep(step.id - 1) || step.id === 1;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center space-y-2">
                <button
                  onClick={() => isAccessible && setCurrentStep(step.id)}
                  disabled={!isAccessible}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg transform scale-110' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : isAccessible
                          ? 'bg-gray-200 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </button>
                <span className={`text-xs font-medium text-center ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-300 ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building2 className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Dane podstawowe</h2>
              <p className="text-gray-600">Sprawdź i uzupełnij podstawowe informacje</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Data zgłoszenia odbioru
                </label>
                <input
                  type="date"
                  value={formData.collectionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-2" />
                  Nazwa firmy
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-700"
                  disabled
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
              <p className="text-gray-600">Podaj adres gdzie mają zostać odebrane bębny</p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {userDrums.map((drum, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                    formData.selectedDrums.includes(drum.KOD_BEBNA)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => handleDrumToggle(drum.KOD_BEBNA)}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.selectedDrums.includes(drum.KOD_BEBNA)}
                      onChange={() => handleDrumToggle(drum.KOD_BEBNA)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{drum.KOD_BEBNA}</h3>
                      <p className="text-sm text-gray-600">{drum.NAZWA}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Termin zwrotu: {new Date(drum.DATA_ZWROTU_DO_DOSTAWCY).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">Podsumowanie zgłoszenia:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Data odbioru:</span>
                  <span className="ml-2 font-medium">{new Date(formData.collectionDate).toLocaleDateString('pl-PL')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Adres:</span>
                  <span className="ml-2 font-medium">{formData.street}, {formData.postalCode} {formData.city}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{formData.email}</span>
                </div>
                <div>
                  <span className="text-gray-600">Godziny:</span>
                  <span className="ml-2 font-medium">{formData.loadingHours}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-600">Wybrane bębny:</span>
                  <span className="ml-2 font-medium">{formData.selectedDrums.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Confirmations */}
            <div className="space-y-4 border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Potwierdzenia wymagane:</h3>
              
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.confirmType}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmType: e.target.checked }))}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-900">
                  Potwierdzam rodzaj i ilość zwracanych opakowań zgodnie z powyższą listą
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
    <div className="min-h-screen pt-6 lg:ml-80 transition-all duration-300">
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
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-2"
                >
                  <span>Dalej</span>
                  <Calendar className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!validateStep(5) || loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

export default ReturnForm;
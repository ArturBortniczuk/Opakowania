import React, { useState, useEffect } from 'react';
import { Truck, X, MapPin, Package, Building2, User } from 'lucide-react';
import { calculatorAPI } from '../utils/calculatorApi';
import { getSalespersonMpk } from '../utils/supabaseApi';
import { supabase } from '../lib/supabase';

const TransportOrderModal = ({ isOpen, onClose, onConfirm, request, user }) => {
  const [destination, setDestination] = useState('Magazyn Białystok');
  const [customDestination, setCustomDestination] = useState({ city: '', postalCode: '', street: '' });
  const [totalWeight, setTotalWeight] = useState(0);
  const [transportDate, setTransportDate] = useState('');
  const [calculatingWeight, setCalculatingWeight] = useState(false);
  const [mpk, setMpk] = useState('');

  useEffect(() => {
    if (isOpen && request) {
      calculateInitialWeight(request.selected_drums);
      fetchUserMpk();
      setTransportDate(request.collection_date ? request.collection_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, request]);

  const fetchUserMpk = async () => {
    // Sprawdzamy klienta i jego przypisanego handlowca
    if (request?.user_nip) {
      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('salesperson_name')
          .eq('nip', request.user_nip)
          .single();
          
        if (companyData?.salesperson_name) {
          const salespersonMpk = await getSalespersonMpk(companyData.salesperson_name);
          if (salespersonMpk) {
            setMpk(salespersonMpk);
            return;
          }
        }
      } catch (e) {
        console.error('Błąd pobierania mpk firmy:', e);
      }
    }
    // Proste pobieranie z profilu, ew. fallback na 'Brak MPK'
    setMpk(user?.mpk || 'Brak przypisanego MPK');
  };

  const calculateInitialWeight = async (drums) => {
    if (!drums || drums.length === 0) {
      setTotalWeight(0);
      return;
    }
    
    setCalculatingWeight(true);
    try {
      let calcWeight = 0;
      const allDimensions = await calculatorAPI.getDrumDimensions();
      
      drums.forEach(drum => {
        // drum może być obiektem lub stringiem
        const drumName = (typeof drum === 'object' ? (drum.nazwa || drum.cecha || drum.kod_bebna || '') : drum).toUpperCase();
        
        // Szukamy pasującego wymiaru
        let diameterCm = null;
        const fiMatch = drumName.match(/FI\s*(\d+)/);
        if (fiMatch) {
          diameterCm = parseInt(fiMatch[1], 10) * 10; // Fi jest w dm, baza w cm
        } else {
          const numMatch = drumName.match(/(\d+)/);
          if (numMatch) {
            const val = parseInt(numMatch[1], 10);
            diameterCm = val < 40 ? val * 10 : val; // Zgadywanie czy dm czy cm
          }
        }

        let foundWeight = 50; // Waga domyślna
        
        if (diameterCm) {
          const matchedDim = allDimensions.find(d => parseFloat(d.outer_diameter) === diameterCm);
          if (matchedDim && matchedDim.weight) {
            foundWeight = parseFloat(matchedDim.weight);
          }
        }
        calcWeight += foundWeight;
      });
      
      setTotalWeight(calcWeight);
    } catch (err) {
      console.error('Błąd obliczania wagi:', err);
      setTotalWeight(0);
    } finally {
      setCalculatingWeight(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let deliveryAddress = {};
    if (destination === 'Magazyn Białystok') {
      deliveryAddress = { city: 'Białystok', postalCode: '15-169', street: 'Wysockiego 69B' };
    } else if (destination === 'Magazyn Zielonka') {
      deliveryAddress = { city: 'Zielonka', postalCode: '05-220', street: 'Krótka 2' };
    } else {
      deliveryAddress = customDestination;
    }

    onConfirm({
      destination: destination === 'Inne' ? 'Inne' : destination,
      deliveryAddress,
      totalWeight,
      transportDate,
      mpk
    });
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Truck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Zleć transport bębnów</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <span className="block text-sm font-bold text-blue-900">Odbiór od klienta:</span>
                <span className="block text-sm text-blue-800">{request.company_name}</span>
                <span className="block text-xs text-blue-600">{request.street}, {request.postal_code} {request.city}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Data transportu
                </label>
                <input
                  type="date"
                  value={transportDate}
                  onChange={(e) => setTransportDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Miejsce docelowe (Dostawa)
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Magazyn Białystok">Magazyn Białystok (Wysockiego 69B)</option>
                  <option value="Magazyn Zielonka">Magazyn Zielonka (Krótka 2)</option>
                  <option value="Inne">Inne miejsce...</option>
                </select>
              </div>
            </div>

            {destination === 'Inne' && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="col-span-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Własny adres dostawy</p>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kod pocztowy</label>
                  <input
                    type="text"
                    value={customDestination.postalCode}
                    onChange={(e) => setCustomDestination({...customDestination, postalCode: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="00-000"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Miasto</label>
                  <input
                    type="text"
                    value={customDestination.city}
                    onChange={(e) => setCustomDestination({...customDestination, city: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ulica i numer</label>
                  <input
                    type="text"
                    value={customDestination.street}
                    onChange={(e) => setCustomDestination({...customDestination, street: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Łączna waga bębnów (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {calculatingWeight && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Waga obliczona automatycznie, możesz edytować.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Numer MPK
                </label>
                <input
                  type="text"
                  value={mpk}
                  onChange={(e) => setMpk(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="np. 522-01-999"
                />
                <p className="text-xs text-gray-500 mt-1">Koszty dla spedycji.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Wyślij zlecenie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransportOrderModal;

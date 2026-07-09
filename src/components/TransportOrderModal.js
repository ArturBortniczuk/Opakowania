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
  const [transportMethod, setTransportMethod] = useState('spedycja');
  const [checkedDrums, setCheckedDrums] = useState([]);
  const [drumProviders, setDrumProviders] = useState({});
  const [distanceKm, setDistanceKm] = useState(0);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [salespersonName, setSalespersonName] = useState('');
  const [deliveryName, setDeliveryName] = useState('');

  useEffect(() => {
    if (isOpen && request) {
      const allDrumCechas = request.selected_drums
        ?.filter(d => typeof d !== 'object' || d.transported !== true)
        .map(d => typeof d === 'object' ? d.cecha || d.kod_bebna : d) || [];
      setCheckedDrums(allDrumCechas);
      fetchUserMpk();
      setTransportDate(request.collection_date ? request.collection_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      
      const fetchProviders = async () => {
        try {
          const cechy = request.selected_drums?.map(d => typeof d === 'object' ? d.cecha || d.kod_bebna : d) || [];
          if (cechy.length > 0) {
            const { data } = await supabase.from('drums').select('cecha, kon_dostawca').in('cecha', cechy);
            if (data) {
              const pMap = {};
              data.forEach(d => { pMap[d.cecha] = d.kon_dostawca; });
              setDrumProviders(pMap);
            }
          }
        } catch (e) {
          console.error('Błąd pobierania dostawców', e);
        }
      };
      fetchProviders();
    } else {
      setCheckedDrums([]);
      setDrumProviders({});
    }
  }, [isOpen, request]);

  useEffect(() => {
    if (isOpen && request) {
      const selected = request.selected_drums?.filter(d => {
        const cecha = typeof d === 'object' ? d.cecha || d.kod_bebna : d;
        return checkedDrums.includes(cecha);
      }) || [];
      calculateInitialWeight(selected);
    }
  }, [checkedDrums, isOpen, request]);

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
          setSalespersonName(companyData.salesperson_name);
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

  const calculateDistance = async () => {
    if (!request) return;
    setCalculatingDistance(true);
    try {
      const origin = `${request.city}, ${request.postal_code}, ${request.street}`;
      let dest = '';
      if (destination === 'Magazyn Białystok') {
        dest = 'Białystok, 15-169, Wysockiego 69B';
      } else if (destination === 'Magazyn Zielonka') {
        dest = 'Zielonka, 05-220, Krótka 2';
      } else {
        if (!customDestination.city || !customDestination.postalCode) {
            setDistanceKm(0);
            setCalculatingDistance(false);
            return;
        }
        dest = `${customDestination.city}, ${customDestination.postalCode}, ${customDestination.street}`;
      }
      
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      if (!apiKey) throw new Error("Brak klucza API");
      
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(dest)}&mode=driving&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
         const dist = Math.round(data.rows[0].elements[0].distance.value / 1000);
         setDistanceKm(dist);
      } else {
         alert('Nie udało się obliczyć odległości dla podanych adresów.');
         setDistanceKm(0);
      }
    } catch(e) {
      console.error(e);
      alert('Błąd podczas obliczania odległości.');
      setDistanceKm(0);
    }
    setCalculatingDistance(false);
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
        let foundWeight = null;
        
        // Sprawdzamy czy bęben ma już określoną wagę
        if (typeof drum === 'object' && drum !== null) {
           const explicitWeight = drum.waga_bebna || drum.WAGA_BEBNA || drum.waga || drum.weight || drum.waga_netto;
           if (explicitWeight && !isNaN(parseFloat(explicitWeight))) {
               foundWeight = parseFloat(explicitWeight);
           }
        }

        if (foundWeight === null) {
          // drum może być obiektem lub stringiem
          const drumName = (typeof drum === 'object' ? (drum.rozmiar_bebna || drum.nazwa || drum.cecha || drum.kod_bebna || '') : String(drum)).toUpperCase();
          
          // Szukamy pasującego wymiaru
          let diameterCm = null;
          const fiMatch = drumName.match(/FI\s*(\d+)/);
          if (fiMatch) {
            const val = parseInt(fiMatch[1], 10);
            diameterCm = val < 40 ? val * 10 : val; // Zgadywanie czy dm czy cm
          } else {
            const numMatch = drumName.match(/(\d+)/);
            if (numMatch) {
              const val = parseInt(numMatch[1], 10);
              diameterCm = val < 40 ? val * 10 : val; // Zgadywanie czy dm czy cm
            }
          }

          foundWeight = 50; // Waga domyślna
          
          if (diameterCm) {
            const matchedDim = allDimensions.find(d => parseFloat(d.outer_diameter) === diameterCm);
            if (matchedDim && matchedDim.weight) {
              foundWeight = parseFloat(matchedDim.weight);
            }
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
      deliveryName: destination === 'Magazyn Białystok' ? 'Magazyn Białystok' : (destination === 'Magazyn Zielonka' ? 'Magazyn Zielonka' : deliveryName),
      totalWeight,
      transportDate,
      mpk,
      transportMethod,
      transportedDrumCechas: checkedDrums,
      distanceKm,
      salespersonName
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Bębny do odebrania ({checkedDrums.length} z {request.selected_drums?.filter(d => typeof d !== 'object' || d.transported !== true).length || 0})
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
              {request.selected_drums?.filter(d => typeof d !== 'object' || d.transported !== true).map((drum, idx) => {
                const cecha = typeof drum === 'object' ? drum.cecha || drum.kod_bebna : drum;
                const nazwa = typeof drum === 'object' ? drum.nazwa || drum.rozmiar_bebna : '';
                const dostawca = drumProviders[cecha] || (typeof drum === 'object' ? drum.kon_dostawca : null) || 'Brak danych';
                const isChecked = checkedDrums.includes(cecha);
                
                return (
                  <label key={idx} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${!isChecked ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCheckedDrums(prev => [...prev, cecha]);
                        } else {
                          setCheckedDrums(prev => prev.filter(c => c !== cecha));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">{cecha} <span className="text-xs text-blue-600 ml-1">({dostawca})</span></span>
                      {nazwa && <span className="text-xs text-gray-500">{nazwa}</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Sposób transportu
              </label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${transportMethod === 'spedycja' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="transportMethod"
                    value="spedycja"
                    checked={transportMethod === 'spedycja'}
                    onChange={(e) => setTransportMethod(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-gray-900">Spedycja</span>
                    <span className="block text-xs text-gray-500">Zgłoszenie do systemu Transport</span>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${transportMethod === 'wlasny' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="transportMethod"
                    value="wlasny"
                    checked={transportMethod === 'wlasny'}
                    onChange={(e) => setTransportMethod(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-gray-900">Transport własny</span>
                    <span className="block text-xs text-gray-500">Tylko zmiana statusu zgłoszenia</span>
                  </div>
                </label>
              </div>
            </div>

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
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nazwa miejsca dostawy (Odbiorca)</label>
                  <input
                    type="text"
                    value={deliveryName}
                    onChange={(e) => setDeliveryName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="np. Magazyn Klienta"
                    required
                  />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-xs text-gray-500 mt-1">Waga obliczona automatycznie.</p>
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Odległość (km)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button 
                    type="button" 
                    onClick={calculateDistance} 
                    disabled={calculatingDistance}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 text-sm font-semibold whitespace-nowrap transition-colors"
                  >
                    {calculatingDistance ? 'Liczenie...' : 'Oblicz'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Dla kosztów transportu.</p>
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

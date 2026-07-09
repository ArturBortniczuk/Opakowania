import React, { useState, useEffect } from 'react';
import { Truck, X, MapPin, Package, Building2, User, Check } from 'lucide-react';
import { calculatorAPI } from '../utils/calculatorApi';
import { getSalespersonMpk } from '../utils/supabaseApi';
import { supabase } from '../lib/supabase';

const KABLOWNIE_DATA = {
  'STYROBUD': { address: 'ul. Górna 194, 36-050 Trzeboś', contact: '+48 663 896 832' },
  'Skierniewice Bruk-bet': { address: 'ul. Czerwona 18A, 96-100 Skierniewice', contact: '884 106 616' },
  'NKT': { address: 'ul. Gajowa 3, 43-254 Warszowice', contact: '+48 538 637 957' },
  'PRYSMIAN': { address: 'ul. Sąsiedzka 1G, 05-806 Sokołów', contact: '+48 725 505 315' },
  'DRUTPLAST': { address: 'ul. Parkowa 23, 78-650 Mirosławiec', contact: '662 448 575' },
  'Forum-Rondo': { address: 'Morszków 56C, 08-304', contact: '+48 25 787 18 10' },
  'Eltrim Kable': { address: 'Ruszkowo 18, 13-200 Działdowo', contact: '+48 23 697 03 00' },
  'Zakłady Kablowe BITNER': { address: 'Krakowska 2, 32-353 Trzyciąż', contact: '+48 12 389 40 24' },
  'Elektrokabel': { address: 'Chopina 151, 62-700 Turek', contact: '604 898 625' },
  'Tele-Fonika Kable Bydgoszcz': { address: 'Fordońska 152, 85-752 Bydgoszcz', contact: '+48 52 364 32 10' },
  'NPA Skawina': { address: 'Józefa Piłsudskiego 23, 32-050 Skawina', contact: '+48 12 276 08 02' },
  'Fabryka Kabli ELPAR': { address: 'ul. Polna 40, 21-200 Parczew', contact: 'karolina.flisiak@elpar.pl' },
  'ZPB KACZMAREK': { address: 'Folwark 1, 63-900 Rawicz', contact: '+48 65 546 12 55' },
  'Betard sp. z o.o.': { address: 'Polna 30, 55-095 Długołęka', contact: '+48 71 315 20 09' },
  'Technokabel': { address: 'Wiatraczna 28, 06-550 Szreńsk', contact: '+48 23 655 17 00' }
};

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
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [unloadingContact, setUnloadingContact] = useState('');

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
      } else if (KABLOWNIE_DATA[destination]) {
        dest = KABLOWNIE_DATA[destination].address;
      } else {
        if (!customDestination.city || !customDestination.postalCode) {
          setDistanceKm(0);
          setCalculatingDistance(false);
          return;
        }
        dest = `${customDestination.city}, ${customDestination.postalCode}, ${customDestination.street}`;
      }

      const transportApiUrl = process.env.REACT_APP_TRANSPORT_API_URL || 'https://transport.grupaeltron.pl/api/spedycje/webhook';
      const baseUrl = transportApiUrl.replace('/api/spedycje/webhook', '');
      const url = `${baseUrl}/api/distance?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(dest)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.rows && data.rows[0].elements[0].status === 'OK') {
        const dist = Math.round(data.rows[0].elements[0].distance.value / 1000);
        setDistanceKm(dist);
      } else {
        alert('Nie udało się obliczyć odległości dla podanych adresów.');
        setDistanceKm(0);
      }
    } catch (e) {
      console.error(e);
      alert('Błąd podczas obliczania odległości.');
      setDistanceKm(0);
    }
    setCalculatingDistance(false);
  };

  useEffect(() => {
    if (destination === 'Magazyn Białystok') {
      setUnloadingContact('691678225');
      setDeliveryAddress('');
    } else if (destination === 'Magazyn Zielonka') {
      setUnloadingContact('691452934');
      setDeliveryAddress('');
    } else if (KABLOWNIE_DATA[destination]) {
      setUnloadingContact(KABLOWNIE_DATA[destination].contact || '');
      setDeliveryAddress(KABLOWNIE_DATA[destination].address || '');
    } else if (destination === 'Inne') {
      if (unloadingContact === '691678225' || unloadingContact === '691452934' || Object.values(KABLOWNIE_DATA).some(k => k.contact === unloadingContact)) {
        setUnloadingContact('');
        setDeliveryAddress('');
      }
    }
  }, [destination]);

  const calculateInitialWeight = async (drums) => {
    if (!drums || drums.length === 0) {
      setTotalWeight(0);
      return;
    }

    setCalculatingWeight(true);
    try {
      let calcWeight = 0;
      const allDimensions = await calculatorAPI.getDrumDimensions();

      const cechy = drums.map(d => typeof d === 'object' ? d.cecha || d.kod_bebna : d).filter(Boolean);
      let dbDrums = [];
      if (cechy.length > 0) {
        const { data } = await supabase.from('drums').select('cecha, kod_bebna, waga_bebna, WAGA_BEBNA, waga, weight, waga_netto').in('cecha', cechy);
        if (data) dbDrums = data;
      }

      drums.forEach(drum => {
        let foundWeight = null;
        const drumCecha = typeof drum === 'object' ? drum.cecha || drum.kod_bebna : drum;
        const dbDrum = dbDrums.find(d => d.cecha === drumCecha || d.kod_bebna === drumCecha) || {};

        const explicitWeight =
          (typeof drum === 'object' ? drum.waga_bebna || drum.WAGA_BEBNA || drum.waga || drum.weight || drum.waga_netto : null) ||
          dbDrum.waga_bebna || dbDrum.WAGA_BEBNA || dbDrum.waga || dbDrum.weight || dbDrum.waga_netto;

        if (explicitWeight && !isNaN(parseFloat(explicitWeight))) {
          foundWeight = parseFloat(explicitWeight);
        }

        if (foundWeight === null) {
          const drumName = (typeof drum === 'object' ? (drum.rozmiar_bebna || drum.nazwa || drum.cecha || drum.kod_bebna || '') : String(drum)).toUpperCase();
          let diameterCm = null;
          const fiMatch = drumName.match(/FI\s*(\d+)/);
          if (fiMatch) {
            const val = parseInt(fiMatch[1], 10);
            diameterCm = val < 40 ? val * 10 : val;
          } else {
            const numMatch = drumName.match(/(\d+)/);
            if (numMatch) {
              const val = parseInt(numMatch[1], 10);
              diameterCm = val < 40 ? val * 10 : val;
            }
          }

          foundWeight = 50;

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

  const handleConfirm = () => {
    let finalDeliveryAddress = {};
    if (destination === 'Magazyn Białystok') {
      finalDeliveryAddress = { city: 'Białystok', postalCode: '15-169', street: 'Wysockiego 69B' };
    } else if (destination === 'Magazyn Zielonka') {
      finalDeliveryAddress = { city: 'Zielonka', postalCode: '05-220', street: 'Krótka 2' };
    } else if (KABLOWNIE_DATA[destination]) {
      finalDeliveryAddress = { name: destination, address: KABLOWNIE_DATA[destination].address };
    } else {
      finalDeliveryAddress = customDestination;
    }

    onConfirm({
      destination: destination === 'Inne' ? 'Inne' : destination,
      deliveryAddress: finalDeliveryAddress,
      deliveryName: destination === 'Magazyn Białystok' ? 'Magazyn Białystok' : (destination === 'Magazyn Zielonka' ? 'Magazyn Zielonka' : deliveryName),
      totalWeight,
      transportDate,
      mpk,
      transportMethod,
      transportedDrumCechas: checkedDrums,
      distanceKm,
      salespersonName,
      unloadingContact
    });
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
      <div className="max-h-[90vh] overflow-y-auto w-full max-w-2xl bg-white rounded-2xl shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-100">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Sposób transportu</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${transportMethod === 'spedycja' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="transportMethod" value="spedycja" checked={transportMethod === 'spedycja'} onChange={(e) => setTransportMethod(e.target.value)} className="w-4 h-4 text-blue-600" />
                  <div><span className="block text-sm font-semibold text-gray-900">Spedycja</span></div>
                </label>
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${transportMethod === 'wlasny' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="transportMethod" value="wlasny" checked={transportMethod === 'wlasny'} onChange={(e) => setTransportMethod(e.target.value)} className="w-4 h-4 text-emerald-600" />
                  <div><span className="block text-sm font-semibold text-gray-900">Własny</span></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Data transportu</label>
                <input type="date" value={transportDate} onChange={(e) => setTransportDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Miejsce docelowe (Dostawa)</label>
                <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white">
                  <optgroup label="Nasze Magazyny">
                    <option value="Magazyn Białystok">Magazyn Białystok (Centrala)</option>
                    <option value="Magazyn Zielonka">Magazyn Zielonka</option>
                  </optgroup>
                  <optgroup label="Dostawcy (Kablownie)">
                    {Object.keys(KABLOWNIE_DATA).map(k => (<option key={k} value={k}>{k}</option>))}
                  </optgroup>
                  <optgroup label="Inne adresy">
                    <option value="Inne">Inne miejsce dostawy...</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {destination === 'Inne' && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <input type="text" placeholder="Nazwa" value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)} className="col-span-3 px-3 py-2 border rounded-lg" required />
                <input type="text" placeholder="Kod pocztowy" value={customDestination.postalCode} onChange={(e) => setCustomDestination({ ...customDestination, postalCode: e.target.value })} className="col-span-1 px-3 py-2 border rounded-lg" required />
                <input type="text" placeholder="Miasto" value={customDestination.city} onChange={(e) => setCustomDestination({ ...customDestination, city: e.target.value })} className="col-span-2 px-3 py-2 border rounded-lg" required />
                <input type="text" placeholder="Ulica i numer" value={customDestination.street} onChange={(e) => setCustomDestination({ ...customDestination, street: e.target.value })} className="col-span-3 px-3 py-2 border rounded-lg" required />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Waga (kg)</label>
                <div className="relative">
                  <input type="number" value={totalWeight} onChange={(e) => setTotalWeight(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" />
                  {calculatingWeight && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div></div>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Telefon odbiorcy</label>
                <input type="text" value={unloadingContact} onChange={(e) => setUnloadingContact(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Odległość (km)</label>
                <div className="flex gap-2">
                  <input type="number" value={distanceKm} onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" />
                  <button type="button" onClick={calculateDistance} disabled={calculatingDistance} className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl font-semibold transition-colors">
                    {calculatingDistance ? '...' : 'Oblicz'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Numer MPK</label>
                <input type="text" value={mpk} onChange={(e) => setMpk(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 bg-gray-50 rounded-xl text-gray-700" placeholder="np. 522-01-999" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium">Anuluj</button>
          <button onClick={handleConfirm} className="px-5 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2"><Check size={18} />Wyślij zgłoszenie</button>
        </div>
      </div>
    </div>
  );
};

export default TransportOrderModal;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { supabase } from '../lib/supabase';
import { returnsAPI } from '../utils/supabaseApi';
import GeocodeMigration from './GeocodeMigration';
import { MapPin, Map as MapIcon, X, Check, Search, AlertTriangle, Filter, Building, User, Eye } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '0.5rem'
};

const center = {
  lat: 52.2297, // Środek Polski
  lng: 21.0122
};

const getAgeInDays = (dateStr) => {
  if (!dateStr) return 0;
  const issueDate = new Date(dateStr);
  if (isNaN(issueDate)) return 0;
  const diffTime = new Date() - issueDate; // Różnica w milisekundach
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const LogisticsMap = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
  });

  const navigate = useNavigate();

  const [map, setMap] = useState(null);
  const [locations, setLocations] = useState([]);
  const [missingAddresses, setMissingAddresses] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Filtry i wyszukiwanie
  const [filter, setFilter] = useState('all'); // 'all', 'drums', 'pickups'
  const [searchQuery, setSearchQuery] = useState(''); // Po cechach
  const [clientSearch, setClientSearch] = useState(''); // Po nazwie klienta
  const [sizeFilter, setSizeFilter] = useState(''); // Po rozmiar_bebna
  const [supplierFilter, setSupplierFilter] = useState(''); // Po kon_dostawca
  const [ageFilter, setAgeFilter] = useState('all'); // '0-50', '50-100', '100-120', '120+'

  // Dynamiczne słowniki dla dropdownów
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableSuppliers, setAvailableSuppliers] = useState([]);

  // Tryb ręcznego przypisywania
  const [assigningAddress, setAssigningAddress] = useState(null);
  const [temporaryMarker, setTemporaryMarker] = useState(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  const fetchData = async () => {
    try {
      // 1. Pobieramy bębny z nowymi kolumnami
      const { data: drumsData, error: drumsError } = await supabase
        .from('drums')
        .select('id, kod_bebna, cecha, rozmiar_bebna, kon_dostawca, data_wydania, adres_dostawy, pelna_nazwa_kontrahenta, latitude, longitude, status, data_zwrotu_do_dostawcy')
        .not('adres_dostawy', 'is', null)
        .neq('adres_dostawy', '')
        .limit(8000);
        
      if (drumsError) console.error(drumsError);

      const drumsByLoc = {};
      const missingByLoc = {};
      const sizesSet = new Set();
      const suppliersSet = new Set();

      (drumsData || []).forEach(d => {
        // Zbieranie unikalnych wartości dla filtrów
        if (d.rozmiar_bebna) sizesSet.add(d.rozmiar_bebna.trim());
        if (d.kon_dostawca) suppliersSet.add(d.kon_dostawca.trim());

        // Normalizacja wyszukiwań
        d.cecha_normalized = (d.cecha || d.kod_bebna || '').toLowerCase();
        d.klient_normalized = (d.pelna_nazwa_kontrahenta || '').toLowerCase();
        
        // Oblicz wiek w dniach
        d.age_days = getAgeInDays(d.data_wydania);

        if (d.latitude && d.longitude) {
          const locKey = `${d.latitude},${d.longitude}`;
          if (!drumsByLoc[locKey]) {
            drumsByLoc[locKey] = {
              id: `loc_${locKey}`,
              lat: parseFloat(d.latitude),
              lng: parseFloat(d.longitude),
              title: d.adres_dostawy || d.pelna_nazwa_kontrahenta || 'Lokalizacja Bębnów',
              type: 'drums',
              address: d.adres_dostawy,
              companyName: d.pelna_nazwa_kontrahenta,
              drums: []
            };
          }
          drumsByLoc[locKey].drums.push(d);
        } else {
          // Brak współrzędnych
          const addr = d.adres_dostawy.trim();
          if (!missingByLoc[addr]) {
            missingByLoc[addr] = {
              address: addr,
              companyName: d.pelna_nazwa_kontrahenta,
              count: 0,
              drumIds: []
            };
          }
          missingByLoc[addr].count++;
          missingByLoc[addr].drumIds.push(d.id);
        }
      });

      setAvailableSizes(Array.from(sizesSet).sort());
      setAvailableSuppliers(Array.from(suppliersSet).sort());

      const groupedDrums = Object.values(drumsByLoc).map(loc => ({
        ...loc,
        drumsCount: loc.drums.length,
        overdueCount: loc.drums.filter(d => new Date(d.data_zwrotu_do_dostawcy) < new Date()).length
      }));

      const missingList = Object.values(missingByLoc).sort((a, b) => b.count - a.count);
      setMissingAddresses(missingList);

      // 2. Pobieramy aktywne zwroty
      const retRes = await returnsAPI.getReturns();
      const pickups = (retRes || []).filter(r => r.status === 'Pending' || r.status === 'Approved')
        .filter(r => r.latitude && r.longitude)
        .map(r => ({
          id: `ret_${r.id}`,
          lat: parseFloat(r.latitude),
          lng: parseFloat(r.longitude),
          title: `Zgłoszenie Odbioru`,
          type: 'pickup',
          companyName: r.company_name,
          address: `${r.street || ''}, ${r.postal_code || ''} ${r.city || ''}`,
          drumsCount: r.selected_drums ? r.selected_drums.length : 0,
          status: r.status,
          date: r.collection_date
        }));

      setLocations([...groupedDrums, ...pickups]);
    } catch (error) {
      console.error('Błąd pobierania danych do mapy:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Kustomowe Ikony SVG (Pin Google z własnym kolorem)
  const getMarkerIcon = (type, maxAgeDays = 0) => {
    if (!window.google) return null; // Zabezpieczenie przed błędem przed wczytaniem skryptu

    let fillColor = '#3B82F6'; // Domyślny niebieski
    
    if (type === 'pickup') {
      fillColor = '#8B5CF6'; // Fioletowy dla zgłoszeń odbioru
    } else if (type === 'drums') {
      if (maxAgeDays > 120) {
        fillColor = '#EF4444'; // Czerwony
      } else if (maxAgeDays >= 100) {
        fillColor = '#F97316'; // Pomarańczowy
      } else if (maxAgeDays >= 50) {
        fillColor = '#EAB308'; // Żółty
      } else {
        fillColor = '#22C55E'; // Zielony
      }
    }

    return {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: fillColor,
      fillOpacity: 1,
      strokeWeight: 1.5,
      strokeColor: '#FFFFFF',
      scale: 1.6,
      anchor: new window.google.maps.Point(12, 24)
    };
  };

  // LOGIKA FILTROWANIA
  const filteredLocations = useMemo(() => {
    let filtered = locations;

    if (filter === 'drums') filtered = filtered.filter(l => l.type === 'drums');
    if (filter === 'pickups') filtered = filtered.filter(l => l.type === 'pickup');

    const sQuery = searchQuery.trim().toLowerCase();
    const cQuery = clientSearch.trim().toLowerCase();
    
    // Filtrowanie zawartości
    filtered = filtered.map(loc => {
      if (loc.type === 'drums') {
        const filteredDrums = loc.drums.filter(d => {
          // Cecha
          if (sQuery && !d.cecha_normalized.includes(sQuery)) return false;
          // Klient
          if (cQuery && !d.klient_normalized.includes(cQuery)) return false;
          // Rozmiar
          if (sizeFilter && d.rozmiar_bebna !== sizeFilter) return false;
          // Kablownia
          if (supplierFilter && d.kon_dostawca !== supplierFilter) return false;
          
          // Przedział Wiekowy
          if (ageFilter !== 'all') {
            if (ageFilter === '0-50' && (d.age_days < 0 || d.age_days >= 50)) return false;
            if (ageFilter === '50-100' && (d.age_days < 50 || d.age_days >= 100)) return false;
            if (ageFilter === '100-120' && (d.age_days < 100 || d.age_days > 120)) return false;
            if (ageFilter === '120+' && d.age_days <= 120) return false;
          }

          return true;
        });

        // Kalkulacja maksymalnego wieku, żeby nadać odpowiedni kolor pinezki
        const maxAge = filteredDrums.length > 0 
          ? Math.max(...filteredDrums.map(d => d.age_days)) 
          : 0;

        return {
          ...loc,
          filteredDrums,
          visibleCount: filteredDrums.length,
          visibleOverdue: filteredDrums.filter(d => new Date(d.data_zwrotu_do_dostawcy) < new Date()).length,
          maxAgeDays: maxAge
        };
      }
      return loc;
    });

    // Ukrywamy puste lokalizacje
    return filtered.filter(loc => loc.type === 'pickup' || loc.visibleCount > 0);
  }, [locations, filter, searchQuery, clientSearch, sizeFilter, supplierFilter, ageFilter]);

  const handleMapClick = (e) => {
    if (assigningAddress) {
      setTemporaryMarker({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
    }
  };

  const handleSaveManualCoordinates = async () => {
    if (!assigningAddress || !temporaryMarker) return;
    
    setIsSavingManual(true);
    try {
      const { error: cacheError } = await supabase
        .from('address_coordinates_cache')
        .upsert({
          address: assigningAddress.address,
          latitude: temporaryMarker.lat,
          longitude: temporaryMarker.lng,
          is_manual: true,
          is_not_found: false
        }, { onConflict: 'address' });

      if (cacheError) throw cacheError;

      const chunkSize = 200;
      for (let j = 0; j < assigningAddress.drumIds.length; j += chunkSize) {
        const chunkIds = assigningAddress.drumIds.slice(j, j + chunkSize);
        await supabase
          .from('drums')
          .update({ latitude: temporaryMarker.lat, longitude: temporaryMarker.lng })
          .in('id', chunkIds);
      }

      setAssigningAddress(null);
      setTemporaryMarker(null);
      await fetchData();

    } catch (error) {
      console.error('Błąd zapisywania ręcznych współrzędnych:', error);
      alert('Nie udało się zapisać ręcznych współrzędnych.');
    } finally {
      setIsSavingManual(false);
    }
  };

  if (loadError) return <div className="p-4 bg-red-50 text-red-700 rounded-lg">Błąd ładowania mapy. Upewnij się, że klucz API jest poprawny.</div>;
  if (!isLoaded) return <div className="p-4">Ładowanie mapy...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        
        {/* NAGŁÓWEK */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0 border-b pb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <MapIcon className="w-6 h-6 mr-2 text-blue-600" />
            Centrum Zarządzania Mapą
          </h2>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Wszystko</button>
            <button onClick={() => setFilter('drums')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'drums' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>Bębny</button>
            <button onClick={() => setFilter('pickups')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pickups' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>Odbiory</button>
          </div>
        </div>

        {/* NOWY PANEL FILTROWANIA ZAAWANSOWANEGO */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="relative">
            <label className="block text-xs font-bold text-gray-700 mb-1">Kod / Cecha bębna</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Np. AB-1234"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-gray-700 mb-1">Nazwa Klienta</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Wpisz nazwę firmy..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Rozmiar Bębna</label>
            <select
              className="w-full py-2 px-3 border border-gray-300 rounded text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
            >
              <option value="">Wszystkie rozmiary</option>
              {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Dostawca (Kablownia)</label>
            <select
              className="w-full py-2 px-3 border border-gray-300 rounded text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            >
              <option value="">Wszyscy dostawcy</option>
              {availableSuppliers.map(sup => <option key={sup} value={sup}>{sup}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status Terminowy (Wiek)</label>
            <select
              className="w-full py-2 px-3 border border-gray-300 rounded text-sm bg-white focus:ring-blue-500 focus:border-blue-500 font-medium"
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
            >
              <option value="all">Wszystkie</option>
              <option value="120+" className="text-red-600 font-bold">🔴 &gt; 120 dni (Pilne!)</option>
              <option value="100-120" className="text-orange-600 font-bold">🟠 100 - 120 dni</option>
              <option value="50-100" className="text-yellow-600 font-bold">🟡 50 - 100 dni</option>
              <option value="0-50" className="text-green-600 font-bold">🟢 0 - 50 dni (Świeże)</option>
            </select>
          </div>

        </div>

        {/* SEKCJA MAPY */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Kolumna Mapy */}
          <div className="flex-grow">
            {assigningAddress && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between shadow-sm animate-pulse">
                <div>
                  <h4 className="font-bold text-yellow-800 flex items-center">
                    <MapPin className="w-5 h-5 mr-1" /> Tryb Ręcznego Przypisywania
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Kliknij miejsce na mapie dla: <strong>{assigningAddress.address}</strong>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => { setAssigningAddress(null); setTemporaryMarker(null); }} className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Anuluj</button>
                  {temporaryMarker && (
                    <button onClick={handleSaveManualCoordinates} disabled={isSavingManual} className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center">
                      {isSavingManual ? 'Zapisywanie...' : <><Check className="w-4 h-4 mr-1" /> Zapisz Punkt</>}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className={`relative rounded-lg overflow-hidden border ${assigningAddress ? 'border-yellow-400 shadow-lg ring-2 ring-yellow-400 ring-opacity-50 cursor-crosshair' : 'border-gray-200'}`}>
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={6}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={handleMapClick}
                options={{ clickableIcons: false, gestureHandling: 'greedy' }}
              >
                {filteredLocations.map((loc) => {
                  const icon = getMarkerIcon(loc.type, loc.maxAgeDays);
                  if (!icon) return null; // Jeszcze nie załadowano Google Maps API

                  return (
                    <MarkerF
                      key={loc.id}
                      position={{ lat: loc.lat, lng: loc.lng }}
                      icon={icon}
                      onClick={() => !assigningAddress && setSelectedLocation(loc)}
                    />
                  );
                })}

                {temporaryMarker && (
                  <MarkerF position={temporaryMarker} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" animation={window.google.maps.Animation.BOUNCE} />
                )}

                {selectedLocation && !assigningAddress && (
                  <InfoWindowF
                    position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                    onCloseClick={() => setSelectedLocation(null)}
                  >
                    <div className="p-3 max-w-sm w-80">
                      <h3 className="font-bold text-gray-900 mb-1 border-b pb-1 truncate" title={selectedLocation.title}>{selectedLocation.title}</h3>
                      <p className="text-sm font-medium text-gray-700 mb-2 truncate flex items-center">
                        <Building className="w-3 h-3 mr-1 inline" /> {selectedLocation.companyName}
                      </p>
                      
                      {selectedLocation.type === 'drums' && (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Widoczne bębny ({selectedLocation.visibleCount})</span>
                            <span className="text-xs font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded">Najstarszy: {selectedLocation.maxAgeDays} dni</span>
                          </div>
                          
                          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 mb-3">
                            {selectedLocation.filteredDrums.map(drum => {
                              const isOverdue = drum.age_days > 120;
                              return (
                                <div key={drum.id} className={`flex flex-col p-2 rounded border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                      <span className="font-mono text-sm font-bold text-gray-800">{drum.cecha || drum.kod_bebna || 'Brak cechy'}</span>
                                      <a 
                                        href={`/admin/drums?searchTerm=${encodeURIComponent(drum.cecha || drum.kod_bebna)}&openModal=true`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 p-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-500 hover:text-blue-600 transition-colors inline-block"
                                        title="Zobacz szczegóły bębna w nowej karcie"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                    {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 ml-1" title="Przeterminowany (>120 dni)" />}
                                  </div>
                                  <div className="flex justify-between items-end mt-1">
                                    <span className="text-xs text-gray-600 font-medium truncate pr-2">{drum.rozmiar_bebna || drum.nazwa || 'Nieznany rozmiar'}</span>
                                    <span className={`text-[10px] font-bold px-1.5 rounded ${drum.age_days > 120 ? 'bg-red-200 text-red-800' : drum.age_days > 100 ? 'bg-orange-200 text-orange-800' : drum.age_days > 50 ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                      {drum.age_days} dni
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                      
                      {selectedLocation.type === 'pickup' && (
                        <div className="bg-purple-50 p-2 rounded mb-3 border border-purple-100">
                          <p className="text-sm text-gray-800 mb-1">Status: <strong>{selectedLocation.status}</strong></p>
                          <p className="text-sm text-gray-800 mb-1">Planowana data: <strong>{selectedLocation.date}</strong></p>
                          <p className="text-sm text-purple-800 font-medium mt-2">Bębny do odbioru: <span className="font-bold">{selectedLocation.drumsCount}</span></p>
                        </div>
                      )}

                      <div className="mt-2">
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block w-full text-center bg-gray-900 text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                          Wyznacz trasę do punktu
                        </a>
                      </div>
                    </div>
                  </InfoWindowF>
                )}
              </GoogleMap>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div> &gt; 120 dni</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div> 100-120 dni</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div> 50-100 dni</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div> 0-50 dni</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div> Odbiory (Zgłoszenia)</div>
            </div>
          </div>

          {/* Panel Boczny: Niezidentyfikowane Adresy */}
          <div className="w-full xl:w-96 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-full max-h-[800px] flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-red-50 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <div>
                    <h3 className="font-bold text-gray-900">Brak współrzędnych</h3>
                    <p className="text-xs text-red-600">Nie znaleziono w Google ({missingAddresses.length})</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {missingAddresses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Wszystkie bębny posiadają współrzędne!
                  </div>
                ) : (
                  missingAddresses.map((missing, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border transition-all ${assigningAddress?.address === missing.address ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-gray-800 break-all">{missing.address}</h4>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                          {missing.count} szt.
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{missing.companyName}</p>
                      
                      <button
                        onClick={() => {
                          setAssigningAddress(missing);
                          setTemporaryMarker(null);
                          if (map) map.setZoom(6);
                        }}
                        className={`w-full py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center transition-colors ${assigningAddress?.address === missing.address ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        <MapPin className="w-3 h-3 mr-1" /> 
                        {assigningAddress?.address === missing.address ? 'Kliknij miejsce na mapie...' : 'Przypisz ręcznie'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <GeocodeMigration />
    </div>
  );
};

export default LogisticsMap;

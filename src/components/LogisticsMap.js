import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { supabase } from '../lib/supabase';
import { returnsAPI } from '../utils/supabaseApi';
import GeocodeMigration from './GeocodeMigration';
import { MapPin, Map as MapIcon, X, Check, Search, AlertTriangle, Filter } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '0.5rem'
};

const center = {
  lat: 52.2297, // Środek Polski
  lng: 21.0122
};

const LogisticsMap = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = useState(null);
  const [locations, setLocations] = useState([]);
  const [missingAddresses, setMissingAddresses] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Filtry i wyszukiwanie
  const [filter, setFilter] = useState('all'); // 'all', 'drums', 'pickups'
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [availableSizes, setAvailableSizes] = useState([]);

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
      // 1. Pobieramy bębny (dodano cecha i nazwa)
      const { data: drumsData, error: drumsError } = await supabase
        .from('drums')
        .select('id, kod_bebna, cecha, nazwa, adres_dostawy, pelna_nazwa_kontrahenta, latitude, longitude, status, data_zwrotu_do_dostawcy')
        .not('adres_dostawy', 'is', null)
        .neq('adres_dostawy', '')
        .limit(8000); // Zwiększony limit dla pełnego oglądu
        
      if (drumsError) console.error(drumsError);

      const drumsByLoc = {};
      const missingByLoc = {};
      const sizesSet = new Set();

      (drumsData || []).forEach(d => {
        // Zbieranie unikalnych rozmiarów
        if (d.nazwa) sizesSet.add(d.nazwa.trim());

        // Normalizacja cechy
        d.cecha_normalized = (d.cecha || d.kod_bebna || '').toLowerCase();

        if (d.latitude && d.longitude) {
          // Ma współrzędne
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

      // Sortuj rozmiary alfabetycznie
      setAvailableSizes(Array.from(sizesSet).sort());

      const groupedDrums = Object.values(drumsByLoc).map(loc => ({
        ...loc,
        drumsCount: loc.drums.length,
        overdueCount: loc.drums.filter(d => new Date(d.data_zwrotu_do_dostawcy) < new Date()).length
      }));

      // Sortowanie missing addresses od największej liczby bębnów
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

  const getMarkerIcon = (type) => {
    const color = type === 'drums' ? 'blue' : 'red';
    return `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`;
  };

  // LOGIKA FILTROWANIA
  const filteredLocations = useMemo(() => {
    let filtered = locations;

    // 1. Podstawowy typ filtra (drums/pickups)
    if (filter === 'drums') filtered = filtered.filter(l => l.type === 'drums');
    if (filter === 'pickups') filtered = filtered.filter(l => l.type === 'pickup');

    // 2. Zaawansowane filtry bębnów (searchQuery i sizeFilter)
    const sQuery = searchQuery.trim().toLowerCase();
    
    // Jeśli użytkownik szuka konkretnego bębna lub rozmiaru, ukrywamy zgłoszenia odbioru
    // (opcjonalnie moglibyśmy szukać też w zgłoszeniach, ale dla uproszczenia filtrujemy je z widoku)
    if (sQuery || sizeFilter) {
      filtered = filtered.filter(loc => loc.type === 'drums').map(loc => {
        // Filtrujemy tablicę .drums wewnątrz każdej lokalizacji
        const filteredDrums = loc.drums.filter(d => {
          const matchQuery = !sQuery || d.cecha_normalized.includes(sQuery);
          const matchSize = !sizeFilter || (d.nazwa && d.nazwa.trim() === sizeFilter);
          return matchQuery && matchSize;
        });

        // Tworzymy kopię lokalizacji, podmieniając tablicę wyświetlanych bębnów na tę przefiltrowaną
        return {
          ...loc,
          filteredDrums,
          visibleCount: filteredDrums.length,
          visibleOverdue: filteredDrums.filter(d => new Date(d.data_zwrotu_do_dostawcy) < new Date()).length
        };
      }).filter(loc => loc.visibleCount > 0); // Ukrywamy lokalizacje, które po odfiltrowaniu bębnów są puste
    } else {
      // Brak zaawansowanych filtrów - wszystkie bębny widoczne
      filtered = filtered.map(loc => {
        if (loc.type === 'drums') {
          return { ...loc, filteredDrums: loc.drums, visibleCount: loc.drumsCount, visibleOverdue: loc.overdueCount };
        }
        return loc;
      });
    }

    return filtered;
  }, [locations, filter, searchQuery, sizeFilter]);

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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0 border-b pb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <MapIcon className="w-6 h-6 mr-2 text-blue-600" />
            Zarządzanie Bębnami
          </h2>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Wszystko</button>
            <button onClick={() => setFilter('drums')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'drums' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>Bębny</button>
            <button onClick={() => setFilter('pickups')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pickups' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Odbiory</button>
          </div>
        </div>

        {/* Panel Wyszukiwania Bębnów */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Wyszukaj bęben po numerze (cesze)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none"
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
            >
              <option value="">Wszystkie rozmiary</option>
              {availableSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

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
                {filteredLocations.map((loc) => (
                  <MarkerF
                    key={loc.id}
                    position={{ lat: loc.lat, lng: loc.lng }}
                    icon={getMarkerIcon(loc.type)}
                    onClick={() => !assigningAddress && setSelectedLocation(loc)}
                  />
                ))}

                {temporaryMarker && (
                  <MarkerF position={temporaryMarker} icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png" animation={window.google.maps.Animation.BOUNCE} />
                )}

                {selectedLocation && !assigningAddress && (
                  <InfoWindowF
                    position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                    onCloseClick={() => setSelectedLocation(null)}
                  >
                    <div className="p-3 max-w-sm w-80">
                      <h3 className="font-bold text-gray-900 mb-1 border-b pb-1 truncate" title={selectedLocation.title}>{selectedLocation.title}</h3>
                      <p className="text-sm font-medium text-gray-700 mb-2 truncate">{selectedLocation.companyName}</p>
                      
                      {selectedLocation.type === 'drums' && (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Wyniki bębnów ({selectedLocation.visibleCount})</span>
                            {selectedLocation.visibleOverdue > 0 && <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold">{selectedLocation.visibleOverdue} po terminie</span>}
                          </div>
                          
                          <div className="max-h-48 overflow-y-auto pr-1 space-y-1 mb-3">
                            {selectedLocation.filteredDrums.map(drum => {
                              const isOverdue = new Date(drum.data_zwrotu_do_dostawcy) < new Date();
                              return (
                                <div key={drum.id} className={`flex justify-between items-center p-2 rounded border ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                  <div>
                                    <span className="font-mono text-sm font-bold text-gray-800">{drum.cecha || drum.kod_bebna || 'Brak cechy'}</span>
                                    <p className="text-xs text-gray-600 truncate max-w-[150px]" title={drum.nazwa}>{drum.nazwa || 'Nieznany rozmiar'}</p>
                                  </div>
                                  {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500" title="Po terminie zwrotu" />}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                      
                      {selectedLocation.type === 'pickup' && (
                        <div className="bg-red-50 p-2 rounded mb-3 border border-red-100">
                          <p className="text-sm text-gray-800 mb-1">Status: <strong>{selectedLocation.status}</strong></p>
                          <p className="text-sm text-gray-800 mb-1">Planowana data: <strong>{selectedLocation.date}</strong></p>
                          <p className="text-sm text-red-800 font-medium mt-2">Bębny do odbioru: <span className="font-bold">{selectedLocation.drumsCount}</span></p>
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
            
            <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
              <ul className="list-disc pl-5 space-y-1">
                <li>Użyj pola <strong>Wyszukaj bęben</strong> aby wpisać jego cechę – odnajdziemy dokładnie ten plac budowy, na którym leży.</li>
                <li>Użyj filtra obok, by wyizolować konkretne rozmiary (np. by ułożyć trasę dla małego busa tylko dla małych bębnów).</li>
              </ul>
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
                          {missing.count} bębnów
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

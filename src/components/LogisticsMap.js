import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { supabase } from '../lib/supabase';
import { returnsAPI } from '../utils/supabaseApi';
import GeocodeMigration from './GeocodeMigration';
import { MapPin, Map as MapIcon, X, Check, Search, AlertTriangle } from 'lucide-react';

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
  const [filter, setFilter] = useState('all'); // 'all', 'drums', 'pickups'

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
      // 1. Pobieramy bębny z i bez latitude/longitude
      const { data: drumsData, error: drumsError } = await supabase
        .from('drums')
        .select('id, kod_bebna, adres_dostawy, pelna_nazwa_kontrahenta, latitude, longitude, status, data_zwrotu_do_dostawcy')
        .not('adres_dostawy', 'is', null)
        .neq('adres_dostawy', '')
        .limit(5000);
        
      if (drumsError) console.error(drumsError);

      const drumsByLoc = {};
      const missingByLoc = {};

      (drumsData || []).forEach(d => {
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

  const filteredLocations = locations.filter(loc => {
    if (filter === 'all') return true;
    if (filter === 'drums') return loc.type === 'drums';
    if (filter === 'pickups') return loc.type === 'pickup';
    return true;
  });

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
      // 1. Zapisujemy w trwałym cache'u
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

      // 2. Aktualizujemy bębny natychmiastowo, żeby widzieć je na mapie (normalnie zrobiłby to trigger przy syncu z ERP, ale chcemy mieć feedback UI)
      const chunkSize = 200;
      for (let j = 0; j < assigningAddress.drumIds.length; j += chunkSize) {
        const chunkIds = assigningAddress.drumIds.slice(j, j + chunkSize);
        await supabase
          .from('drums')
          .update({ latitude: temporaryMarker.lat, longitude: temporaryMarker.lng })
          .in('id', chunkIds);
      }

      // 3. Reset UI i ponowne pobranie
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <MapIcon className="w-6 h-6 mr-2 text-blue-600" />
            Mapa Logistyczna
          </h2>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Wszystko
            </button>
            <button
              onClick={() => setFilter('drums')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'drums' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
            >
              Lokalizacje Bębnów
            </button>
            <button
              onClick={() => setFilter('pickups')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pickups' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              Zaplanowane Odbiory
            </button>
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
                    Kliknij wybrane miejsce na mapie, aby trwale ustalić położenie dla: <br/>
                    <strong>{assigningAddress.address}</strong> (Bębny: {assigningAddress.count})
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => { setAssigningAddress(null); setTemporaryMarker(null); }}
                    className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
                  >
                    Anuluj
                  </button>
                  {temporaryMarker && (
                    <button 
                      onClick={handleSaveManualCoordinates}
                      disabled={isSavingManual}
                      className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center"
                    >
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
                options={{
                  clickableIcons: false, // Zapobiega klikaniu w biznesy na mapie
                  gestureHandling: 'greedy' // Ułatwia przesuwanie
                }}
              >
                {/* Rysujemy stałe punkty tylko gdy nie przypisujemy lub by mieć kontekst */}
                {filteredLocations.map((loc) => (
                  <MarkerF
                    key={loc.id}
                    position={{ lat: loc.lat, lng: loc.lng }}
                    icon={getMarkerIcon(loc.type)}
                    onClick={() => !assigningAddress && setSelectedLocation(loc)}
                  />
                ))}

                {/* Tymczasowy Marker przypisywany ręcznie */}
                {temporaryMarker && (
                  <MarkerF
                    position={temporaryMarker}
                    icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    animation={window.google.maps.Animation.BOUNCE}
                  />
                )}

                {selectedLocation && !assigningAddress && (
                  <InfoWindowF
                    position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                    onCloseClick={() => setSelectedLocation(null)}
                  >
                    <div className="p-3 max-w-xs">
                      <h3 className="font-bold text-gray-900 mb-1 border-b pb-1">{selectedLocation.title}</h3>
                      <p className="text-sm font-medium text-gray-700 mb-2">{selectedLocation.companyName}</p>
                      
                      {selectedLocation.type === 'drums' && (
                        <div className="bg-blue-50 p-2 rounded mb-3 border border-blue-100">
                          <p className="text-sm text-blue-800 font-medium">Bębny w tej lokalizacji: <span className="font-bold">{selectedLocation.drumsCount}</span></p>
                          {selectedLocation.overdueCount > 0 && (
                            <p className="text-xs text-red-600 font-medium mt-1">W tym po terminie: {selectedLocation.overdueCount}</p>
                          )}
                        </div>
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
                <li><strong>Niebieskie znaczniki:</strong> Lokalizacje, gdzie fizycznie znajdują się bębny.</li>
                <li><strong>Czerwone znaczniki:</strong> Potwierdzone lub oczekujące zgłoszenia odbioru.</li>
              </ul>
            </div>
          </div>

          {/* Panel Boczny: Niezidentyfikowane Adresy */}
          <div className="w-full xl:w-96 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-full max-h-[800px] flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-red-50 rounded-t-xl flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <div>
                  <h3 className="font-bold text-gray-900">Brak współrzędnych</h3>
                  <p className="text-xs text-red-600">Adresy nie odnalezione przez Google ({missingAddresses.length})</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {missingAddresses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Wszystkie bębny z adresem posiadają współrzędne!
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
                          // Skroluje mapę na środek Polski aby łatwiej szukać
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

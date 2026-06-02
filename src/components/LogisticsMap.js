import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { supabase } from '../lib/supabase';
import { returnsAPI } from '../utils/supabaseApi';
import GeocodeMigration from './GeocodeMigration';

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '0.5rem'
};

const center = {
  lat: 52.2297, // Środek Polski (Warszawa)
  lng: 21.0122
};

const LogisticsMap = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'drums', 'pickups'

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Pobieramy bębny z latitude/longitude i grupujemy je po adresie
        // Ze względu na ew. limit 1000 rekordów, najlepiej pobierać wszystkie poprzez zapytanie w pętli lub rpc
        // Na potrzeby MVP pobieramy do 5000 aktywnych bębnów, które mają współrzędne
        const { data: drumsData, error: drumsError } = await supabase
          .from('drums')
          .select('id, kod_bebna, adres_dostawy, pelna_nazwa_kontrahenta, latitude, longitude, status, data_zwrotu_do_dostawcy')
          .not('latitude', 'is', null)
          .limit(5000);
          
        if (drumsError) console.error(drumsError);

        const drumsByLoc = {};
        (drumsData || []).forEach(d => {
          // Unikalny klucz na bazie współrzędnych, żeby grupować bębny pod tym samym punktem
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
        });

        const groupedDrums = Object.values(drumsByLoc).map(loc => ({
          ...loc,
          drumsCount: loc.drums.length,
          overdueCount: loc.drums.filter(d => new Date(d.data_zwrotu_do_dostawcy) < new Date()).length
        }));

        // 2. Pobieramy aktywne zwroty z latitude/longitude
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

    fetchData();
  }, []);

  const getMarkerIcon = (type) => {
    // Niebieski dla bębnów na budowach/u klientów, Czerwony dla zgłoszeń odbioru
    const color = type === 'drums' ? 'blue' : 'red';
    return `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`;
  };

  const filteredLocations = locations.filter(loc => {
    if (filter === 'all') return true;
    if (filter === 'drums') return loc.type === 'drums';
    if (filter === 'pickups') return loc.type === 'pickup';
    return true;
  });

  if (loadError) return <div className="p-4 bg-red-50 text-red-700 rounded-lg">Błąd ładowania mapy. Upewnij się, że klucz API jest poprawny.</div>;
  if (!isLoaded) return <div className="p-4">Ładowanie mapy...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Mapa Logistyczna
        </h2>
        
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
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

      <div className="relative rounded-lg overflow-hidden border border-gray-200">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={6}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {filteredLocations.map((loc) => (
            <MarkerF
              key={loc.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              icon={getMarkerIcon(loc.type)}
              onClick={() => setSelectedLocation(loc)}
            />
          ))}

          {selectedLocation && (
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
        <p className="font-medium text-gray-700 mb-2">Instrukcja obsługi mapy:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Niebieskie znaczniki:</strong> Lokalizacje, gdzie fizycznie znajdują się bębny (np. budowy, magazyny).</li>
          <li><strong>Czerwone znaczniki:</strong> Potwierdzone lub oczekujące zgłoszenia odbioru.</li>
          <li>Kliknij znacznik, aby zobaczyć, ile bębnów znajduje się w danym miejscu oraz by wyznaczyć trasę dla kierowcy.</li>
        </ul>
      </div>

      <GeocodeMigration />
    </div>
  );
};

export default LogisticsMap;

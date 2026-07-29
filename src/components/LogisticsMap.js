import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { supabase } from '../lib/supabase';
import { returnsAPI, drumsAPI, transportAPI } from '../utils/supabaseApi';
import GeocodeMigration from './GeocodeMigration';
import { MapPin, Map as MapIcon, X, Check, Search, AlertTriangle, Filter, Building, User, Eye, Truck, Mail } from 'lucide-react';
import TransportOrderModal from './TransportOrderModal';

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

const LogisticsMap = ({ user }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');

  const [map, setMap] = useState(null);
  const [locations, setLocations] = useState([]);
  const [missingAddresses, setMissingAddresses] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Filtry i wyszukiwanie
  const [filter, setFilter] = useState(urlFilter || 'pickups'); // domyślnie 'pickups', opcje: 'all', 'drums', 'pickups', 'warehouse_ready'
  const [searchQuery, setSearchQuery] = useState(''); // Po cechach
  const [clientSearch, setClientSearch] = useState(''); // Po nazwie klienta
  const [sizeFilter, setSizeFilter] = useState(''); // Po rozmiar_bebna
  const [supplierFilter, setSupplierFilter] = useState(''); // Po kon_dostawca
  const [minAge, setMinAge] = useState(''); // Termin zwrotu od (dni)
  const [maxAge, setMaxAge] = useState(''); // Termin zwrotu do (dni)

  // Dynamiczne słowniki dla dropdownów
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableSuppliers, setAvailableSuppliers] = useState([]);

  // Tryb ręcznego przypisywania
  const [assigningLocation, setAssigningLocation] = useState(null);
  const [temporaryMarker, setTemporaryMarker] = useState(null);
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Transport z mapy
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [requestForTransport, setRequestForTransport] = useState(null);

  // Wyszukiwanie miejscowości na mapie
  const [citySearchInput, setCitySearchInput] = useState('');
  const [searchingCity, setSearchingCity] = useState(false);

  const handleSearchCity = (e) => {
    if (e) e.preventDefault();
    const query = citySearchInput.trim();
    if (!query) return;

    if (!map || !window.google || !window.google.maps) {
      alert('Mapa nie została jeszcze załadowana.');
      return;
    }

    setSearchingCity(true);
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode(
      { address: query, componentRestrictions: { country: 'PL' } },
      (results, status) => {
        setSearchingCity(false);
        if (status === 'OK' && results && results[0]) {
          const first = results[0];
          if (first.geometry.viewport) {
            map.fitBounds(first.geometry.viewport);
          } else if (first.geometry.location) {
            map.setCenter(first.geometry.location);
            map.setZoom(12);
          }
        } else {
          // Spróbuj bez restrykcji kraju
          geocoder.geocode({ address: query }, (res2, status2) => {
            if (status2 === 'OK' && res2 && res2[0]) {
              if (res2[0].geometry.viewport) {
                map.fitBounds(res2[0].geometry.viewport);
              } else if (res2[0].geometry.location) {
                map.setCenter(res2[0].geometry.location);
                map.setZoom(12);
              }
            } else {
              alert(`Nie znaleziono miejscowości "${query}". Sprawdź poprawność nazwy.`);
            }
          });
        }
      }
    );
  };

  const handleResetMap = () => {
    if (map) {
      map.setCenter({ lat: 52.2297, lng: 21.0122 });
      map.setZoom(6);
    }
  };

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  const fetchData = async () => {
    try {
      // 1. Pobieramy bębny (z respektowaniem uprawnień handlowców)
      let allDrums = [];
      try {
        allDrums = await drumsAPI.getAllDrums();
      } catch (err) {
        console.error('Błąd pobierania bębnów do mapy:', err);
      }
      
      const drumsData = allDrums;

      // Pobieramy cały cache (z paginacją, by uniknąć limitu 1000)
      let allCacheData = [];
      let cPage = 0;
      while (true) {
        const { data: cacheChunk, error: cacheError } = await supabase
          .from('address_coordinates_cache')
          .select('address, latitude, longitude')
          .range(cPage * 1000, cPage * 1000 + 999);
        
        if (cacheError) break;
        if (cacheChunk && cacheChunk.length > 0) allCacheData = [...allCacheData, ...cacheChunk];
        if (!cacheChunk || cacheChunk.length < 1000) break;
        cPage++;
      }
      
      // Słownik cache dla szybkiego dostępu (ignorujemy wielkość liter i spacje)
      const cacheMap = {};
      allCacheData.forEach(c => {
        if (c.address && c.latitude) {
          cacheMap[c.address.trim().toLowerCase()] = c;
        }
      });

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

        const addrTrimmed = (d.adres_dostawy || '').trim();
        
        // Jeśli bęben nie ma jeszcze przypisanych współrzędnych, próbujemy je "w locie" dobrać z cache
        if (!d.latitude || !d.longitude) {
          const isJunkAddress = !addrTrimmed || addrTrimmed === ',' || addrTrimmed.replace(/[^a-zA-Z0-9]/g, '').length < 2;
          const compTrimmed = (d.pelna_nazwa_kontrahenta || '').trim();

          if (!isJunkAddress && cacheMap[addrTrimmed.toLowerCase()]) {
            const cached = cacheMap[addrTrimmed.toLowerCase()];
            d.latitude = cached.latitude;
            d.longitude = cached.longitude;
          } else if (compTrimmed && cacheMap[compTrimmed.toLowerCase()]) {
            const cached = cacheMap[compTrimmed.toLowerCase()];
            d.latitude = cached.latitude;
            d.longitude = cached.longitude;
          }
        }

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
          const addr = addrTrimmed || 'Brak przypisanego adresu';
          const comp = d.pelna_nazwa_kontrahenta || 'Nieznany klient';
          const missingKey = `${comp}___${addr}`;
          
          if (!missingByLoc[missingKey]) {
            missingByLoc[missingKey] = {
              address: addr,
              companyName: comp,
              count: 0,
              drumIds: []
            };
          }
          missingByLoc[missingKey].count++;
          missingByLoc[missingKey].drumIds.push(d.id);
        }
      });

      setAvailableSizes(Array.from(sizesSet).sort());
      setAvailableSuppliers(Array.from(suppliersSet).sort());

      const groupedDrums = Object.values(drumsByLoc).map(loc => ({
        ...loc,
        drumsCount: loc.drums.length,
        overdueCount: loc.drums.filter(d => new Date(d.data_zwrotu_do_dostawcy) < new Date()).length
      }));

      // 2. Pobieramy aktywne zwroty
      const retRes = await returnsAPI.getReturns();
      
      // 2b. Pobieramy mapowanie MPK
      let mpkByNip = {};
      try {
        const { data: companies } = await supabase.from('companies').select('nip, salesperson_name');
        const { data: salespeople } = await supabase.from('salespeople').select('name, mpk');
        if (companies && salespeople) {
          companies.forEach(c => {
            if (c.salesperson_name) {
              const sp = salespeople.find(s => s.name === c.salesperson_name);
              if (sp && sp.mpk) {
                mpkByNip[c.nip] = sp.mpk;
              }
            }
          });
        }
      } catch (err) {
        console.error('Błąd pobierania danych MPK', err);
      }

      const pickupsByLoc = {};

      (retRes || [])
        .filter(r => r.status === 'Pending' || r.status === 'Approved' || r.status === 'InTransit')
        .forEach(r => {
          let lat = r.latitude;
          let lng = r.longitude;
          const address = `${r.street || ''}, ${r.postal_code || ''} ${r.city || ''}`.trim();
          const companyName = (r.company_name || '').trim();

          // Próba znalezienia koordynatów w cache, jeśli nie ma ich na obiekcie
          if (!lat || !lng) {
            if (address && cacheMap[address.toLowerCase()]) {
              lat = cacheMap[address.toLowerCase()].latitude;
              lng = cacheMap[address.toLowerCase()].longitude;
            } else if (companyName && cacheMap[companyName.toLowerCase()]) {
              lat = cacheMap[companyName.toLowerCase()].latitude;
              lng = cacheMap[companyName.toLowerCase()].longitude;
            }
          }

          if (lat && lng) {
            const locKey = `${lat},${lng}`;
            if (!pickupsByLoc[locKey]) {
              pickupsByLoc[locKey] = {
                id: `loc_pickup_${locKey}`,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                title: companyName ? `Zgłoszenia: ${companyName}` : `Zgłoszenia Odbioru`,
                type: 'pickup',
                companyName: companyName,
                address: address,
                mpk: mpkByNip[r.user_nip] || r.mpk || '',
                pickups: []
              };
            }
            
            const notesStr = r.notes || '';
            const matchPhone = notesStr.match(/Telefon kontaktowy:\s*([\d\s\+\-]{8,20})/);
            const extractedPhone = matchPhone ? matchPhone[1].trim() : '';

            pickupsByLoc[locKey].pickups.push({
              id: `ret_${r.id}`,
              requestId: r.id,
              drumsCount: r.selected_drums ? r.selected_drums.length : 0,
              selected_drums: (r.selected_drums || []).map(drum => {
                const isObject = typeof drum === 'object' && drum !== null;
                const isPallet = isObject && (drum.isPallet || drum.type === 'pallet' || (drum.name && !drum.cecha && !drum.kod_bebna));

                if (isPallet) {
                  const rawName = drum.name || drum.nazwa || drum.pallet_type || 'Paleta';
                  const cleanName = rawName.startsWith('Paleta') ? rawName : `Paleta ${rawName}`;
                  const qty = drum.count || drum.quantity || drum.ilosc || 1;
                  return {
                    isPallet: true,
                    name: cleanName,
                    quantity: qty,
                    kon_dostawca: drum.kon_dostawca || ''
                  };
                }

                const cecha = isObject ? (drum.cecha || drum.kod_bebna) : drum;
                const isDamaged = isObject && drum.isDamaged;
                const description = isObject ? drum.description : '';
                const fullDrum = drumsData.find(d => (d.cecha || d.kod_bebna) === cecha) || {};
                
                return {
                  cecha,
                  isDamaged,
                  description,
                  kon_dostawca: isObject && drum.kon_dostawca ? drum.kon_dostawca : fullDrum.kon_dostawca,
                  rozmiar_bebna: isObject && drum.rozmiar_bebna ? drum.rozmiar_bebna : (fullDrum.rozmiar_bebna || fullDrum.nazwa)
                };
              }),
              status: r.status,
              priority: r.priority,
              date: r.collection_date,
              profileEmail: r.email || r.profile_email || '',
              profilePhone: r.profile_phone || extractedPhone || '',
              profileName: r.profile_name || '',
              mpk: r.mpk || '',
              originalRequest: r
            });
          } else {
            // Dodaj do listy brakujących adresów, by można było przypisać ręcznie
            const missingKey = `${companyName}___${address}`;
            if (!missingByLoc[missingKey]) {
              missingByLoc[missingKey] = {
                address: address || 'Brak adresu',
                companyName: companyName || 'Nieznany klient',
                count: 0,
                drumIds: [],
                pickupIds: []
              };
            }
            missingByLoc[missingKey].count++;
            if (!missingByLoc[missingKey].pickupIds) missingByLoc[missingKey].pickupIds = [];
            missingByLoc[missingKey].pickupIds.push(r.id);
          }
        });

      const missingList = Object.values(missingByLoc).sort((a, b) => b.count - a.count);
      setMissingAddresses(missingList);

      const groupedPickups = Object.values(pickupsByLoc);

      // 3. Pobieramy bębny gotowe do zwrotu z magazynu (Czarna pineska z podziałem na miejscowości z pola 'magazyn')
      const warehouseReadyLocations = [];
      try {
        const readyCechy = await drumsAPI.getReadyForReturnCechy();
        if (readyCechy && readyCechy.length > 0) {
          const warehouseDrumsRes = await drumsAPI.getWarehouseDrums({ limit: 5000 });
          const readyWarehouseDrums = (warehouseDrumsRes.data || []).filter(d => 
            readyCechy.includes(d.cecha) || readyCechy.includes(d.kod_bebna)
          );

          if (readyWarehouseDrums.length > 0) {
            // Grupowanie według nazwy magazynu / miejscowości
            const drumsByWarehouse = {};
            readyWarehouseDrums.forEach(d => {
              const magName = d.magazyn || 'Magazyn Białystok';
              if (!drumsByWarehouse[magName]) {
                drumsByWarehouse[magName] = [];
              }
              drumsByWarehouse[magName].push(d);
            });

            const warehouseDetailsMap = {
              'lublin': {
                companyName: 'Magazyn Lublin',
                street: 'Energetyków 10',
                postal_code: '20-468',
                city: 'Lublin',
                lat: 51.2335,
                lng: 22.5684
              },
              'białystok': {
                companyName: 'Magazyn Białystok',
                street: 'Wysockiego 69B',
                postal_code: '15-169',
                city: 'Białystok',
                lat: 53.1585,
                lng: 23.1812
              },
              'bialystok': {
                companyName: 'Magazyn Białystok',
                street: 'Wysockiego 69B',
                postal_code: '15-169',
                city: 'Białystok',
                lat: 53.1585,
                lng: 23.1812
              },
              'zielonka': {
                companyName: 'Magazyn Zielonka',
                street: 'Krótka 2',
                postal_code: '05-220',
                city: 'Zielonka',
                lat: 52.3082,
                lng: 21.1610
              },
              'poznan': {
                companyName: 'Magazyn Poznań',
                street: 'Magazynowa 1',
                postal_code: '60-001',
                city: 'Poznań',
                lat: 52.4064,
                lng: 16.9252
              },
              'poznań': {
                companyName: 'Magazyn Poznań',
                street: 'Magazynowa 1',
                postal_code: '60-001',
                city: 'Poznań',
                lat: 52.4064,
                lng: 16.9252
              },
              'warszawa': {
                companyName: 'Magazyn Zielonka',
                street: 'Krótka 2',
                postal_code: '05-220',
                city: 'Zielonka',
                lat: 52.3082,
                lng: 21.1610
              },
              'elk': {
                companyName: 'Magazyn Ełk',
                street: 'Przemysłowa 1',
                postal_code: '19-300',
                city: 'Ełk',
                lat: 53.8266,
                lng: 22.3619
              },
              'ełk': {
                companyName: 'Magazyn Ełk',
                street: 'Przemysłowa 1',
                postal_code: '19-300',
                city: 'Ełk',
                lat: 53.8266,
                lng: 22.3619
              },
              'katowice': {
                companyName: 'Magazyn Katowice',
                street: 'Hutnicza 1',
                postal_code: '40-001',
                city: 'Katowice',
                lat: 50.2649,
                lng: 19.0238
              },
              'wroclaw': {
                companyName: 'Magazyn Wrocław',
                street: 'Fabryczna 1',
                postal_code: '50-001',
                city: 'Wrocław',
                lat: 51.1100,
                lng: 17.0333
              },
              'wrocław': {
                companyName: 'Magazyn Wrocław',
                street: 'Fabryczna 1',
                postal_code: '50-001',
                city: 'Wrocław',
                lat: 51.1100,
                lng: 17.0333
              },
              'gdansk': {
                companyName: 'Magazyn Gdańsk',
                street: 'Portowa 1',
                postal_code: '80-001',
                city: 'Gdańsk',
                lat: 54.3520,
                lng: 18.6466
              },
              'gdańsk': {
                companyName: 'Magazyn Gdańsk',
                street: 'Portowa 1',
                postal_code: '80-001',
                city: 'Gdańsk',
                lat: 54.3520,
                lng: 18.6466
              },
              'rzeszow': {
                companyName: 'Magazyn Rzeszów',
                street: 'Kolejowa 1',
                postal_code: '35-001',
                city: 'Rzeszów',
                lat: 50.0412,
                lng: 21.9991
              },
              'rzeszów': {
                companyName: 'Magazyn Rzeszów',
                street: 'Kolejowa 1',
                postal_code: '35-001',
                city: 'Rzeszów',
                lat: 50.0412,
                lng: 21.9991
              }
            };

            Object.entries(drumsByWarehouse).forEach(([magName, drums]) => {
              const cleanCity = magName.replace(/^magazyn\s+/i, '').trim();
              const lowerCity = cleanCity.toLowerCase();
              
              let whInfo = warehouseDetailsMap[lowerCity];
              if (!whInfo) {
                const words = lowerCity.split(/\s+/);
                for (const w of words) {
                  if (warehouseDetailsMap[w]) {
                    whInfo = warehouseDetailsMap[w];
                    break;
                  }
                }
              }

              const street = whInfo?.street || '';
              const postal_code = whInfo?.postal_code || '';
              const city = whInfo?.city || cleanCity || 'Białystok';
              const companyName = whInfo?.companyName || magName;

              let lat = drums.find(d => d.latitude)?.latitude || whInfo?.lat;
              let lng = drums.find(d => d.longitude)?.longitude || whInfo?.lng;

              if (!lat || !lng) {
                if (cacheMap[lowerCity]) {
                  lat = cacheMap[lowerCity].latitude;
                  lng = cacheMap[lowerCity].longitude;
                }
              }

              lat = lat ? parseFloat(lat) : 53.1585;
              lng = lng ? parseFloat(lng) : 23.1812;

              const displayAddress = street ? `${street}, ${postal_code} ${city}` : `Miejscowość: ${city}`;

              warehouseReadyLocations.push({
                id: `loc_wh_ready_${magName.replace(/[^a-zA-Z0-9]/g, '_')}`,
                lat,
                lng,
                title: `${companyName} - Gotowe do zwrotu (${drums.length} szt.)`,
                type: 'warehouse_ready',
                companyName,
                address: displayAddress,
                street,
                postal_code,
                city,
                drums,
                visibleCount: drums.length
              });
            });
          }
        }
      } catch (err) {
        console.error('Błąd pobierania bębnów gotowych z magazynu do mapy:', err);
      }

      setLocations([...groupedDrums, ...groupedPickups, ...warehouseReadyLocations]);
    } catch (error) {
      console.error('Błąd pobierania danych do mapy:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Kustomowy generator ikony pineski pół na pół (dwukolorowej) z gradientem pionowym
  const createSplitMarkerIcon = (colorLeft, colorRight) => {
    if (!window.google) return null;
    const gradientId = `grad_${colorLeft.replace('#','')}_${colorRight.replace('#','')}`;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 24 32">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="50%" stop-color="${colorLeft}" />
      <stop offset="50%" stop-color="${colorRight}" />
    </linearGradient>
  </defs>
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="url(#${gradientId})" stroke="#FFFFFF" stroke-width="1.2" />
</svg>`.trim();

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(38, 50),
      anchor: new window.google.maps.Point(19, 50)
    };
  };

  // Kustomowe Ikony SVG (Pin Google z własnym kolorem)
  const getMarkerIcon = (type, maxAgeDays = 0, status = null, priority = null) => {
    if (!window.google) return null; // Zabezpieczenie przed błędem przed wczytaniem skryptu

    let fillColor = '#3B82F6'; // Domyślny niebieski
    
    if (type === 'warehouse_ready') {
      fillColor = '#000000'; // Czarna pineska dla bębnów gotowych z magazynu do zwrotu!
    } else if (type === 'pickup') {
      if (priority === 'High') {
        fillColor = '#EF4444'; // Czerwony dla priorytetowych zgłoszeń
      } else if (status === 'InTransit') {
        fillColor = '#F97316'; // Pomarańczowy dla zgłoszeń w transporcie
      } else {
        fillColor = '#8B5CF6'; // Fioletowy dla pozostałych zgłoszeń
      }
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

  // Wyznaczanie odpowiedniej ikony dla lokalizacji (obsługa pineski pół na pół przy mieszanych statusach)
  const getMarkerIconForLocation = (loc) => {
    if (!window.google) return null;

    if (loc.type === 'warehouse_ready') {
      return getMarkerIcon('warehouse_ready');
    }

    if (loc.type === 'drums') {
      return getMarkerIcon('drums', loc.maxAgeDays);
    }

    if (loc.type === 'pickup') {
      const pickups = loc.pickups || [];
      
      // Wyznaczamy jednolity kolor dla każdego zgłoszenia z osobna
      const pickupColors = pickups.map(p => {
        if (p.priority === 'High') return '#EF4444'; // Czerwony dla pilnego zgłoszenia
        if (p.status === 'InTransit') return '#F97316'; // Pomarańczowy dla zgłoszenia w transporcie
        return '#8B5CF6'; // Fioletowy dla pozostałych oczekujących
      });

      const uniqueColors = Array.from(new Set(pickupColors));

      if (uniqueColors.length >= 2) {
        // Co najmniej 2 RÓŻNE ZGŁOSZENIA o różnych kolorach w jednym miejscu -> Pineska PÓŁ NA PÓŁ!
        return createSplitMarkerIcon(uniqueColors[0], uniqueColors[1]);
      } else if (uniqueColors.length === 1) {
        const singleColor = uniqueColors[0];
        const status = singleColor === '#F97316' ? 'InTransit' : 'Pending';
        const priority = singleColor === '#EF4444' ? 'High' : 'Normal';
        return getMarkerIcon('pickup', 0, status, priority);
      }
    }

    return getMarkerIcon('pickup');
  };

  // LOGIKA FILTROWANIA
  const filteredLocations = useMemo(() => {
    let filtered = locations;

    if (filter === 'drums') {
      filtered = filtered.filter(l => l.type === 'drums');
    } else if (filter === 'pickups') {
      // W zakładce "Odbiory" wyświetlamy zgłoszenia odbiorów ORAZ czarne pineski bębnów gotowych z magazynów
      filtered = filtered.filter(l => l.type === 'pickup' || l.type === 'warehouse_ready');
    } else if (filter === 'warehouse_ready') {
      filtered = filtered.filter(l => l.type === 'warehouse_ready');
    }

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
          
          // Przedział Wiekowy (Od - Do dni)
          if (minAge !== '' && d.age_days < parseInt(minAge, 10)) return false;
          if (maxAge !== '' && d.age_days > parseInt(maxAge, 10)) return false;

          return true;
        });

        // Kalkulacja maksymalnego wieku, żeby nadać odpowiedni kolor pinezki
        const calculatedMaxAge = filteredDrums.length > 0 
          ? Math.max(...filteredDrums.map(d => d.age_days)) 
          : 0;

        return {
          ...loc,
          filteredDrums,
          visibleCount: filteredDrums.length,
          visibleOverdue: filteredDrums.filter(d => new Date(d.data_zwrotu_do_dostawcy) < new Date()).length,
          maxAgeDays: calculatedMaxAge
        };
      }
      return loc;
    });

    // Ukrywamy puste lokalizacje
    return filtered.filter(loc => {
      if (loc.type === 'pickup') {
        const cQuery = clientSearch.trim().toLowerCase();
        if (cQuery && loc.companyName && !loc.companyName.toLowerCase().includes(cQuery)) {
          return false;
        }
        return true;
      }
      return loc.visibleCount > 0;
    });
  }, [locations, filter, searchQuery, clientSearch, sizeFilter, supplierFilter, minAge, maxAge]);

  const handleMapClick = useCallback(async (e) => {
    if (!assigningLocation) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setTemporaryMarker({ lat, lng });

    if (window.confirm(`Czy na pewno chcesz przypisać te współrzędne dla klienta "${assigningLocation.companyName}" (${assigningLocation.address})?`)) {
      try {
        const isAddressJunk = assigningLocation.address === 'Brak przypisanego adresu' || assigningLocation.address.length < 2;
        const cacheKey = isAddressJunk ? assigningLocation.companyName : assigningLocation.address;

        if (cacheKey && cacheKey.length > 2) {
          await supabase
            .from('address_coordinates_cache')
            .upsert({
              address: cacheKey,
              latitude: lat,
              longitude: lng,
              is_manual: true,
              is_not_found: false
            }, { onConflict: 'address' });
        }

        // Aktualizuj Bębny po ID - to najbezpieczniejsze i zapewnia, że nie zmienimy innych!
        // Supabase w in() przyjmuje max ok 1000 elementów, ale dla pewności dzielimy na chunki po 500
        const chunkSize = 500;
        const drumIds = assigningLocation.drumIds || [];
        for (let i = 0; i < drumIds.length; i += chunkSize) {
          const chunkIds = drumIds.slice(i, i + chunkSize);
          const { error: drumsError } = await supabase
            .from('drums')
            .update({ latitude: lat, longitude: lng })
            .in('id', chunkIds);
          if (drumsError) throw drumsError;
        }

        const pickupIds = assigningLocation.pickupIds || [];
        for (let i = 0; i < pickupIds.length; i += chunkSize) {
          const chunkIds = pickupIds.slice(i, i + chunkSize);
          const { error: pickupsError } = await supabase
            .from('return_requests')
            .update({ latitude: lat, longitude: lng })
            .in('id', chunkIds);
          if (pickupsError) throw pickupsError;
        }

        alert('Pomyślnie przypisano współrzędne!');
        setAssigningLocation(null);
        setTemporaryMarker(null);
        fetchData();
      } catch (error) {
        console.error('Błąd przypisywania:', error);
        alert('Wystąpił błąd podczas przypisywania współrzędnych.');
      }
    } else {
      setTemporaryMarker(null);
    }
  }, [assigningLocation, fetchData]);

  const handleTransportConfirm = async (transportData) => {
    try {
      const updatedDrums = requestForTransport.selected_drums.map(d => {
        const cecha = typeof d === 'object' ? d.cecha || d.kod_bebna : d;
        const isTransportedNow = transportData.transportedDrumCechas.includes(cecha);
        return { ...d, transported: isTransportedNow };
      });
      const transportedCount = transportData.transportedDrumCechas.length;

      if (transportData.transportMethod === 'spedycja') {
        const selectedDrumsDetails = requestForTransport.selected_drums.filter(d => {
            const cecha = typeof d === 'object' ? d.cecha || d.kod_bebna : d;
            return transportData.transportedDrumCechas.includes(cecha);
        });

        const drumsDescParts = selectedDrumsDetails.map(d => {
            if (typeof d === 'object') {
                const cecha = d.cecha || d.kod_bebna || '';
                const size = d.rozmiar_bebna || d.nazwa || '';
                const weight = d.waga_bebna || d.WAGA_BEBNA || d.weight || d.waga || '';
                return `${cecha} ${size ? `(${size})` : ''}${weight ? ` - ${weight}kg` : ''}`;
            }
            return d;
        });
        const goodsDesc = drumsDescParts.join(', ');

        const spedycjaPayload = {
          createdBy: user?.name || 'Admin Opakowania',
          createdByEmail: user?.email || 'admin@grupaeltron.pl',
          responsiblePerson: transportData.salespersonName || user?.name || 'Admin Opakowania',
          responsibleEmail: user?.email || 'admin@grupaeltron.pl',
          mpk: transportData.mpk,
          location: 'Odbiory własne',
          producerAddress: {
            city: requestForTransport.city,
            postalCode: requestForTransport.postal_code,
            street: requestForTransport.street
          },
          delivery: transportData.deliveryAddress,
          loadingContact: ((requestForTransport.notes || '').match(/Telefon kontaktowy:\s*([\d\s\+\-]{8,20})/)?.[1]?.trim()) || requestForTransport.profile_phone || 'Brak telefonu',
          unloadingContact: transportData.unloadingContact || '',
          deliveryDate: transportData.transportDate,
          notes: `Zgłoszenie z Opakowań #${requestForTransport.id}\nGodziny załadunku: ${requestForTransport.loading_hours || 'Brak'}\nSprzęt: ${requestForTransport.available_equipment || 'Brak'}\n${requestForTransport.notes || ''}`,
          clientName: transportData.deliveryName || requestForTransport.company_name,
          sourceClientName: requestForTransport.company_name,
          distanceKm: transportData.distanceKm || 0,
          goodsDescription: {
            description: `Bębny z kablowni (${transportedCount} szt.): ${goodsDesc}`,
            weight: transportData.totalWeight
          }
        };

        await transportAPI.createTransportOrder(spedycjaPayload);
      }

      if (String(requestForTransport.id).startsWith('MAG_')) {
        alert(`Pomyślnie utworzono zlecenie transportu dla bębnów z magazynu!`);
      } else {
        await returnsAPI.updateReturnStatus(requestForTransport.id, {
          status: 'InTransit',
          transport_date: transportData.transportDate,
          selected_drums: updatedDrums
        });
      }
      
      setShowTransportModal(false);
      setRequestForTransport(null);
      setSelectedLocation(null);
      fetchData();
      
      if (transportData.transportMethod === 'spedycja') {
        alert('Zlecenie spedycyjne zostało pomyślnie wysłane do systemu Transport!');
      } else {
        alert('Status zgłoszenia został zaktualizowany na Transport własny.');
      }
    } catch (err) {
      console.error('Błąd wysyłania zlecenia z mapy:', err);
      alert('Nie udało się wysłać zlecenia: ' + err.message);
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
            <button onClick={() => setFilter('drums')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'drums' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>Bębny (Klienci)</button>
            <button onClick={() => setFilter('pickups')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors ${filter === 'pickups' ? 'bg-purple-700 text-white shadow-sm' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
              <span>Odbiory</span>
              <span className="w-2.5 h-2.5 rounded-full bg-black border border-white shrink-0" title="Zawiera czarne pineski bębnów z magazynów"></span>
            </button>
          </div>
        </div>

        {/* WYSZUKIWARKA MIEJSCOWOŚCI I PRZYBLIŻANIE */}
        <form onSubmit={handleSearchCity} className="bg-blue-50/70 border border-blue-100 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Wyszukiwarka Miejscowości</h3>
              <p className="text-xs text-gray-500">Wpisz miasto lub miejscowość, aby automatycznie przybliżyć do niej widok mapy</p>
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center space-x-2">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Np. Warszawa, Białystok, Poznań..."
                value={citySearchInput}
                onChange={(e) => setCitySearchInput(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={searchingCity}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center space-x-1 shrink-0"
            >
              {searchingCity ? (
                <span>Szukam...</span>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-1" />
                  <span>Przybliż</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetMap}
              className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
              title="Zresetuj widok do całej Polski"
            >
              Cała Polska
            </button>
          </div>
        </form>

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

          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Dni w posiadaniu (od)</label>
              <input
                type="number"
                placeholder="Np. 120"
                className="w-full py-2 px-3 border border-gray-300 rounded text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Dni w posiadaniu (do)</label>
              <input
                type="number"
                placeholder="Np. 720"
                className="w-full py-2 px-3 border border-gray-300 rounded text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
              />
            </div>
          </div>

        </div>

        {/* SEKCJA MAPY */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Kolumna Mapy */}
          <div className="flex-grow">
            {assigningLocation && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between shadow-sm animate-pulse">
                <div>
                  <h4 className="font-bold text-yellow-800 flex items-center">
                    <MapPin className="w-5 h-5 mr-1" /> Tryb Ręcznego Przypisywania
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Kliknij miejsce na mapie dla klienta: <br/><strong>{assigningLocation.companyName}</strong> <br/><span className="text-xs">({assigningLocation.address})</span>
                  </p>
                </div>
                <button onClick={() => setAssigningLocation(null)} className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Anuluj</button>
              </div>
            )}

            <div className={`relative rounded-lg overflow-hidden border ${assigningLocation ? 'border-yellow-400 shadow-lg ring-2 ring-yellow-400 ring-opacity-50 cursor-crosshair' : 'border-gray-200'}`}>
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
                  const icon = getMarkerIconForLocation(loc);
                  if (!icon) return null; // Jeszcze nie załadowano Google Maps API

                  return (
                    <MarkerF
                      key={loc.id}
                      position={{ lat: loc.lat, lng: loc.lng }}
                      icon={icon}
                      onClick={() => {
                        if (!assigningLocation) {
                          setSelectedLocation(loc);
                        }
                      }}
                    />
                  );
                })}

                {temporaryMarker && (
                  <MarkerF position={temporaryMarker} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" animation={window.google.maps.Animation.BOUNCE} />
                )}

                {selectedLocation && !assigningLocation && (
                  <InfoWindowF
                    position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                    onCloseClick={() => setSelectedLocation(null)}
                  >
                    <div className="p-3 max-w-sm w-80">
                      <h3 className="font-bold text-gray-900 mb-1 border-b pb-1 truncate" title={selectedLocation.title}>
                        {selectedLocation.type === 'pickup' ? 'Zgłoszenia Odbioru' : selectedLocation.title}
                      </h3>
                      
                      <div className="mb-3 border-b border-gray-100 pb-2">
                        <p className="text-sm font-bold text-blue-700 truncate flex items-center">
                          <Building className="w-4 h-4 mr-1.5 inline" /> {selectedLocation.companyName}
                        </p>
                        {selectedLocation.mpk && (
                          <p className="text-xs text-gray-600 mt-1 truncate flex items-center">
                            <span className="font-bold mr-1">MPK:</span> {selectedLocation.mpk}
                          </p>
                        )}
                        {selectedLocation.address && (
                          <p className="text-xs text-gray-600 mt-1 truncate flex items-center">
                            <MapPin className="w-3 h-3 mr-1.5 inline" /> {selectedLocation.address}
                          </p>
                        )}
                        {selectedLocation.type === 'pickup' && selectedLocation.pickups?.[0]?.profileEmail && (
                          <p className="text-xs text-gray-600 mt-1 truncate flex items-center">
                            <Mail className="w-3 h-3 mr-1.5 inline" /> {selectedLocation.pickups[0].profileEmail}
                          </p>
                        )}
                        {selectedLocation.type === 'pickup' && selectedLocation.pickups?.[0]?.profilePhone && (
                          <p className="text-xs text-gray-600 mt-1.5 truncate flex items-center">
                            <User className="w-3 h-3 mr-1.5 inline" /> 
                            {selectedLocation.pickups[0].profileName && <span>{selectedLocation.pickups[0].profileName} </span>}
                            <span className="font-bold ml-1">{selectedLocation.pickups[0].profilePhone}</span>
                          </p>
                        )}
                      </div>
                      
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
                      
                      {selectedLocation.type === 'warehouse_ready' && (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Bębny gotowe do zwrotu ({selectedLocation.drums.length} szt.)
                            </span>
                          </div>
                          
                          <div className="max-h-56 overflow-y-auto pr-1 space-y-2 mb-3">
                            {selectedLocation.drums.map((drum, idx) => (
                              <div key={drum.id || idx} className="flex flex-col p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 shadow-xs">
                                <div className="flex justify-between items-start">
                                  <span className="font-mono text-sm font-bold text-gray-900">
                                    {drum.cecha || drum.kod_bebna || 'Brak cechy'}
                                  </span>
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    {drum.kon_dostawca || 'Kablownia'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-end mt-1.5 text-xs text-gray-600">
                                  <span>Rozmiar: {drum.nazwa || drum.rozmiar_bebna || 'Brak'}</span>
                                  <span className="font-medium text-gray-500">WMS: {drum.lokalizacja_wms || 'Brak'}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => {
                              const syntheticRequest = {
                                id: `MAG_${selectedLocation.companyName.replace(/[^a-zA-Z0-9]/g, '_')}`,
                                company_name: selectedLocation.companyName,
                                street: selectedLocation.street || 'Wysockiego 69B',
                                postal_code: selectedLocation.postal_code || '15-169',
                                city: selectedLocation.city || 'Białystok',
                                user_nip: '0000000000',
                                selected_drums: selectedLocation.drums.map(d => ({
                                  cecha: d.cecha || d.kod_bebna,
                                  kon_dostawca: d.kon_dostawca,
                                  rozmiar_bebna: d.nazwa || d.rozmiar_bebna
                                })),
                                notes: `[Zlecenie zwrotu bębnów z magazynu do kablowni]: ${selectedLocation.drums.map(d => d.cecha || d.kod_bebna).join(', ')}`
                              };
                              setRequestForTransport(syntheticRequest);
                              setShowTransportModal(true);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <Truck className="w-4 h-4" />
                            <span>Zleć transport</span>
                          </button>
                        </>
                      )}

                      {selectedLocation.type === 'pickup' && selectedLocation.pickups && (
                        <div className="max-h-[400px] overflow-y-auto pr-1">
                          {selectedLocation.pickups.map(pickup => (
                            <div key={pickup.id} className="mb-4 last:mb-0 border-b last:border-0 pb-4 last:pb-0 border-gray-200">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-purple-800 text-sm flex items-center">
                                  Zgłoszenie #{pickup.requestId}
                                  {pickup.priority === 'High' && <AlertTriangle className="w-4 h-4 text-red-500 ml-1.5" title="Priorytet: Wysoki" />}
                                </h4>
                                <a 
                                  href={`/admin/returns?searchTerm=${pickup.requestId}&openModalId=${pickup.requestId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-purple-600 text-white hover:bg-purple-700 rounded text-xs font-medium transition-colors flex items-center"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> Szczegóły
                                </a>
                              </div>
                              
                              <div className="bg-purple-50 p-2 rounded mb-3 border border-purple-100">
                                <p className="text-sm text-gray-800 mb-1">Status: <strong className={pickup.status === 'InTransit' ? 'text-orange-600' : ''}>
                                  {pickup.status === 'Pending' ? 'Oczekujące' : 
                                   pickup.status === 'Approved' ? 'Zatwierdzone do transportu' :
                                   pickup.status === 'InTransit' ? 'W transporcie' :
                                   pickup.status === 'Completed' ? 'Zakończone' :
                                   pickup.status === 'Rejected' ? 'Odrzucone' : pickup.status}
                                </strong></p>
                                <p className="text-sm text-gray-800 mb-1">Planowana data: <strong>{pickup.date ? new Date(pickup.date).toLocaleDateString() : 'Brak'}</strong></p>
                                <div className="mt-2 pt-2 border-t border-purple-200 flex justify-between items-center">
                                  <span className="text-sm text-purple-800 font-medium">Zgłoszone bębny: <span className="font-bold">{pickup.drumsCount}</span></span>
                                  {(pickup.status === 'Approved' || pickup.status === 'InTransit') && (
                                    <button
                                      onClick={() => {
                                        setRequestForTransport(pickup.originalRequest);
                                        setShowTransportModal(true);
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded text-[11px] font-bold transition-colors shadow-sm flex items-center"
                                    >
                                      <Truck className="w-3.5 h-3.5 mr-1" /> Zleć transport
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {pickup.selected_drums && pickup.selected_drums.length > 0 && (
                                <div className="space-y-1.5 mb-3">
                                  {pickup.selected_drums.map((drum, idx) => {
                                    const isPallet = drum.isPallet || drum.type === 'pallet' || (!drum.cecha && (drum.name || drum.nazwa || drum.pallet_type));
                                    if (isPallet) {
                                      const rawName = drum.name || drum.nazwa || drum.pallet_type || 'Paleta';
                                      const cleanName = rawName.startsWith('Paleta') ? rawName : `Paleta ${rawName}`;
                                      const qty = drum.quantity || drum.count || drum.ilosc || 1;

                                      return (
                                        <div key={idx} className="flex flex-col p-2 rounded-lg border bg-amber-50/80 border-amber-200 shadow-xs">
                                          <div className="flex justify-between items-center">
                                            <span className="font-sans text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                              📦 {cleanName}
                                            </span>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-900">
                                              {qty} {qty === 1 ? 'sztuka' : (qty > 1 && qty < 5 ? 'sztuki' : 'sztuk')}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    const cecha = drum.cecha;
                                    const isDamaged = drum.isDamaged;
                                    return (
                                      <div key={idx} className={`flex flex-col p-2 rounded border ${isDamaged ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex justify-between items-start">
                                          <div className="flex flex-col">
                                            <span className={`font-mono text-sm font-bold ${isDamaged ? 'text-red-700' : 'text-gray-800'}`}>
                                              {cecha || 'Brak cechy'}
                                              {drum.kon_dostawca && (
                                                <span className="text-xs font-normal text-gray-500 ml-1">({drum.kon_dostawca})</span>
                                              )}
                                            </span>
                                            {drum.rozmiar_bebna && (
                                              <span className="text-xs text-gray-600">{drum.rozmiar_bebna}</span>
                                            )}
                                          </div>
                                          {isDamaged && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 ml-1" title="Zgłoszono uszkodzenie" />}
                                        </div>
                                        {drum.description && (
                                          <p className="text-[10px] text-gray-600 italic mt-1 truncate">{drum.description}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
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
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div> Odbiory w Transporcie</div>
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
                    <p className="text-xs text-red-600">Nie znaleziono w Google ({missingAddresses.filter(m => {
                      if (filter === 'pickups') return m.pickupIds && m.pickupIds.length > 0;
                      if (filter === 'drums') return m.drumIds && m.drumIds.length > 0;
                      return true;
                    }).length})</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {missingAddresses.filter(m => {
                  if (filter === 'pickups') return m.pickupIds && m.pickupIds.length > 0;
                  if (filter === 'drums') return m.drumIds && m.drumIds.length > 0;
                  return true;
                }).length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Wszystkie pozycje posiadają współrzędne!
                  </div>
                ) : (
                  missingAddresses.filter(m => {
                    if (filter === 'pickups') return m.pickupIds && m.pickupIds.length > 0;
                    if (filter === 'drums') return m.drumIds && m.drumIds.length > 0;
                    return true;
                  }).map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border transition-all ${assigningLocation?.address === m.address ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col">
                          <p className="font-bold text-gray-800 break-words">{m.companyName}</p>
                          <p className="text-xs text-gray-500">{m.address}</p>
                        </div>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold whitespace-nowrap ml-2">
                          {filter === 'pickups' 
                            ? `${m.pickupIds?.length || 0} zgłoszeń` 
                            : filter === 'drums' 
                              ? `${m.drumIds?.length || 0} bębnów`
                              : `${m.count} pozycje`
                          }
                        </span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setAssigningLocation({ 
                            address: m.address, 
                            companyName: m.companyName, 
                            drumIds: m.drumIds,
                            pickupIds: m.pickupIds
                          });
                          alert(`Kliknij na mapie w miejscu, gdzie znajduje się adres:\n${m.address} (Klient: ${m.companyName || 'Brak'})`);
                        }}
                        className="w-full mt-3 flex items-center justify-center space-x-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition text-xs font-medium"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Przypisz ręcznie</span>
                      </button>

                      {assigningLocation && assigningLocation.address === m.address && assigningLocation.companyName === m.companyName && (
                        <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded flex justify-between items-center">
                          <span>Wskazujesz na mapie...</span>
                          <button onClick={(e) => { e.stopPropagation(); setAssigningLocation(null); }} className="text-yellow-800 hover:underline">Anuluj</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <GeocodeMigration />
      
      <TransportOrderModal
        isOpen={showTransportModal}
        onClose={() => {
          setShowTransportModal(false);
          setRequestForTransport(null);
        }}
        onConfirm={handleTransportConfirm}
        request={requestForTransport}
        user={user}
      />
    </div>
  );
};

export default LogisticsMap;
